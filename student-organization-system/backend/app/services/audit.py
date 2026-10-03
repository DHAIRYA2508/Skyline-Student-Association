from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.utils.common import jsonable, new_id


def log(db: Session, ctx, action: str, entity_type: str, entity_id: Any = None,
        old: Optional[dict] = None, new: Optional[dict] = None, org_id: Any = None, actor_id: Any = None) -> AuditLog:
    req = getattr(ctx, "request", None) if ctx is not None else None
    entry = AuditLog(
        id=new_id(),
        organization_id=str(org_id or (ctx.org_id if ctx else None) or "") or None,
        actor_id=str(actor_id or (ctx.user.id if ctx else None) or "") or None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        old_values=jsonable(old) if old is not None else None,
        new_values=jsonable(new) if new is not None else None,
        ip_address=(req.client.host if req is not None and req.client else None),
        user_agent=(req.headers.get("user-agent", "")[:500] if req is not None else None),
    )
    db.add(entry)
    return entry
