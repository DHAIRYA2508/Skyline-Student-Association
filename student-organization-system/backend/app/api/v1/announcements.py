from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.communication import Announcement, Notification
from app.models.organization import Role, User, UserRole
from app.schemas.requests import AnnouncementIn
from app.services import audit
from app.utils.common import iso, new_id, now, s

router = APIRouter(prefix="/announcements", tags=["Announcements"])
AUDIENCES = ("ALL", "MEMBERS", "VOLUNTEERS", "STAFF")


def out(a: Announcement, db) -> dict:
    u = db.query(User).filter(User.id == s(a.created_by)).first()
    return {"id": s(a.id), "title": a.title, "content": a.content, "audience_type": a.audience_type, "status": a.status,
            "author": f"{u.first_name} {u.last_name}" if u else "", "published_at": iso(a.published_at),
            "created_at": iso(a.created_at)}


def _visible(a: Announcement, ctx: Ctx) -> bool:
    if a.audience_type == "ALL":
        return True
    if a.audience_type == "MEMBERS":
        return ctx.member is not None
    if a.audience_type == "VOLUNTEERS":
        return "VOLUNTEER" in ctx.roles
    return any(r not in ("MEMBER", "VOLUNTEER") for r in ctx.roles)


@router.get("")
def list_announcements(status: str = "", ctx: Ctx = Depends(current_ctx)):
    q = ctx.db.query(Announcement).filter(Announcement.organization_id == ctx.org_id)
    if ctx.can("announcements.manage"):
        if status:
            q = q.filter(Announcement.status == status.upper())
        return [out(a, ctx.db) for a in q.order_by(Announcement.created_at.desc()).all()]
    rows = q.filter(Announcement.status == "PUBLISHED").order_by(Announcement.published_at.desc()).all()
    return [out(a, ctx.db) for a in rows if _visible(a, ctx)]


def _notify(ctx: Ctx, a: Announcement):
    q = ctx.db.query(User).filter(User.organization_id == ctx.org_id, User.is_active == True)  # noqa: E712
    for u in q.all():
        db_roles = [r for (r,) in ctx.db.query(Role.name).join(UserRole, UserRole.role_id == Role.id)
                    .filter(UserRole.user_id == s(u.id)).all()]
        ok = (a.audience_type == "ALL" or (a.audience_type == "MEMBERS") or
              (a.audience_type == "VOLUNTEERS" and "VOLUNTEER" in db_roles) or
              (a.audience_type == "STAFF" and any(r not in ("MEMBER", "VOLUNTEER") for r in db_roles)))
        if ok:
            ctx.db.add(Notification(id=new_id(), organization_id=ctx.org_id, user_id=s(u.id), type="ANNOUNCEMENT",
                                    title=a.title, message=a.content[:300], reference_type="ANNOUNCEMENT",
                                    reference_id=s(a.id)))


@router.post("", status_code=201)
def create(body: AnnouncementIn, ctx: Ctx = Depends(require("announcements.manage"))):
    if body.audience_type not in AUDIENCES:
        raise HTTPException(400, f"audience_type must be one of {AUDIENCES}")
    a = Announcement(id=new_id(), organization_id=ctx.org_id, title=body.title, content=body.content,
                     audience_type=body.audience_type, created_by=s(ctx.user.id),
                     status="PUBLISHED" if body.publish else "DRAFT", published_at=now() if body.publish else None)
    ctx.db.add(a)
    ctx.db.flush()
    if body.publish:
        _notify(ctx, a)
    audit.log(ctx.db, ctx, "ANNOUNCEMENT_PUBLISHED" if body.publish else "ANNOUNCEMENT_DRAFTED", "Announcement", a.id,
              new={"title": a.title, "audience": a.audience_type})
    ctx.db.commit()
    return out(a, ctx.db)


@router.put("/{ann_id}")
def update(ann_id: str, body: AnnouncementIn, ctx: Ctx = Depends(require("announcements.manage"))):
    a = get_or_404(ctx.db, Announcement, ann_id, ctx.org_id)
    if a.status != "DRAFT":
        raise HTTPException(409, "Only drafts can be edited")
    a.title, a.content, a.audience_type = body.title, body.content, body.audience_type
    ctx.db.commit()
    return out(a, ctx.db)


@router.post("/{ann_id}/{action}")
def transition(ann_id: str, action: str, ctx: Ctx = Depends(require("announcements.manage"))):
    a = get_or_404(ctx.db, Announcement, ann_id, ctx.org_id)
    if action == "publish":
        if a.status == "PUBLISHED":
            raise HTTPException(409, "Already published")
        a.status, a.published_at = "PUBLISHED", now()
        _notify(ctx, a)
    elif action == "archive":
        a.status = "ARCHIVED"
    else:
        raise HTTPException(404, "Unknown action")
    audit.log(ctx.db, ctx, f"ANNOUNCEMENT_{action.upper()}", "Announcement", a.id)
    ctx.db.commit()
    return out(a, ctx.db)
