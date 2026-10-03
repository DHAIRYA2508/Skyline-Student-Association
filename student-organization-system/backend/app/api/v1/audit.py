from fastapi import APIRouter, Depends, Query

from app.api.deps import Ctx, require
from app.models.audit import AuditLog
from app.models.organization import User
from app.utils.common import iso, s

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("")
def logs(action: str = "", entity_type: str = "", page: int = Query(1, ge=1), page_size: int = Query(40, le=200),
         ctx: Ctx = Depends(require("audit.view"))):
    q = ctx.db.query(AuditLog).filter(AuditLog.organization_id == ctx.org_id)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    total = q.count()
    items = []
    for a in q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all():
        u = ctx.db.query(User).filter(User.id == s(a.actor_id)).first() if a.actor_id else None
        items.append({"id": s(a.id), "action": a.action, "entity_type": a.entity_type, "entity_id": s(a.entity_id),
                      "actor": f"{u.first_name} {u.last_name}" if u else "System", "old_values": a.old_values,
                      "new_values": a.new_values, "ip_address": a.ip_address, "created_at": iso(a.created_at)})
    return {"total": total, "page": page, "page_size": page_size, "items": items}
