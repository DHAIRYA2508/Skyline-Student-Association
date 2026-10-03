from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.member import Member
from app.schemas.requests import MemberUpdate
from app.services import audit, membership as msvc
from app.utils.common import iso, s

router = APIRouter(prefix="/members", tags=["Members"])


def member_out(db, m: Member) -> dict:
    ms = msvc.summary(db, m)
    return {"id": s(m.id), "student_id": m.student_id, "first_name": m.first_name, "last_name": m.last_name,
            "email": m.email, "phone": m.phone, "status": m.status, "join_date": iso(m.join_date),
            "membership_state": ms["state"], "plan_name": ms.get("plan_name"), "end_date": ms.get("end_date"),
            "days_until_expiry": ms.get("days_until_expiry"), "is_active_member": ms["is_active"]}


@router.get("")
def list_members(search: str = "", status: str = "", page: int = Query(1, ge=1), page_size: int = Query(25, le=100),
                 ctx: Ctx = Depends(require("members.view", "members.manage"))):
    q = ctx.db.query(Member).filter(Member.organization_id == ctx.org_id, Member.is_deleted == False)  # noqa: E712
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(Member.first_name.ilike(like), Member.last_name.ilike(like), Member.email.ilike(like),
                         Member.student_id.ilike(like)))
    if status:
        q = q.filter(Member.status == status.upper())
    total = q.count()
    rows = q.order_by(Member.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [member_out(ctx.db, m) for m in rows]}


@router.get("/verify")
def verify(query: str = Query(..., min_length=2), ctx: Ctx = Depends(require("checkin.perform", "members.view", "events.manage"))):
    """Door / desk check: is this person a member right now?"""
    like = query.strip()
    m = ctx.db.query(Member).filter(Member.organization_id == ctx.org_id, Member.is_deleted == False,  # noqa: E712
                                    or_(Member.student_id == like, Member.email.ilike(like))).first()
    if not m:
        m = ctx.db.query(Member).filter(Member.organization_id == ctx.org_id, Member.is_deleted == False,  # noqa: E712
                                        or_(Member.student_id.ilike(f"%{like}%"), Member.email.ilike(f"%{like}%"))).first()
    if not m:
        return {"found": False, "query": query}
    return {"found": True, "member": member_out(ctx.db, m), "membership": msvc.summary(ctx.db, m)}


@router.get("/me")
def me(ctx: Ctx = Depends(current_ctx)):
    m = ctx.member
    if not m:
        raise HTTPException(404, "No member profile")
    return member_out(ctx.db, m)


@router.get("/{member_id}")
def get_member(member_id: str, ctx: Ctx = Depends(require("members.view", "members.manage"))):
    m = get_or_404(ctx.db, Member, member_id, ctx.org_id)
    return {**member_out(ctx.db, m), "membership": msvc.summary(ctx.db, m)}


@router.patch("/{member_id}")
def update_member(member_id: str, body: MemberUpdate, ctx: Ctx = Depends(require("members.manage"))):
    m = get_or_404(ctx.db, Member, member_id, ctx.org_id)
    old = member_out(ctx.db, m)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(m, k, v.upper() if k == "status" else v)
    audit.log(ctx.db, ctx, "MEMBER_UPDATED", "Member", m.id, old=old, new=body.model_dump(exclude_none=True))
    ctx.db.commit()
    return member_out(ctx.db, m)
