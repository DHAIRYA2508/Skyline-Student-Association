from fastapi import APIRouter, Depends

from app.api.deps import Ctx, current_ctx
from app.models.communication import Notification
from app.utils.common import iso, now, s

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def mine(ctx: Ctx = Depends(current_ctx)):
    rows = ctx.db.query(Notification).filter(Notification.user_id == s(ctx.user.id)).order_by(Notification.created_at.desc()).limit(50).all()
    return {"unread": len([r for r in rows if not r.is_read]),
            "items": [{"id": s(r.id), "type": r.type, "title": r.title, "message": r.message, "is_read": r.is_read,
                       "created_at": iso(r.created_at)} for r in rows]}


@router.post("/read-all")
def read_all(ctx: Ctx = Depends(current_ctx)):
    for r in ctx.db.query(Notification).filter(Notification.user_id == s(ctx.user.id), Notification.is_read == False).all():  # noqa: E712
        r.is_read, r.read_at = True, now()
    ctx.db.commit()
    return {"ok": True}
