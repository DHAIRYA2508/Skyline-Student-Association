from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session
from app.api.deps import Ctx, current_ctx, require
from app.db.session import get_db
from app.models.organization import Organization
from app.schemas.requests import OrgUpdate
from app.services import audit
from app.utils.common import s

router = APIRouter(prefix="/organizations", tags=["Organizations"])


def out(o: Organization) -> dict:
    return {"id": s(o.id), "name": o.name, "slug": o.slug, "description": o.description, "email": o.email,
            "phone": o.phone, "academic_year": o.academic_year}


@router.get("/current")
def current(ctx: Ctx = Depends(current_ctx)):
    return out(ctx.db.query(Organization).filter(Organization.id == ctx.org_id).first())


@router.get("/public")
def public(db: Session = Depends(get_db)):
    o = db.query(Organization).filter(Organization.is_active == True).order_by(Organization.created_at).first()  # noqa: E712
    return {"name": o.name, "slug": o.slug, "description": o.description} if o else None


@router.patch("/current")
def update(body: OrgUpdate, ctx: Ctx = Depends(require("org.manage"))):
    o = ctx.db.query(Organization).filter(Organization.id == ctx.org_id).first()
    old = out(o)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(o, k, v)
    audit.log(ctx.db, ctx, "ORG_UPDATED", "Organization", o.id, old=old, new=body.model_dump(exclude_none=True))
    ctx.db.commit()
    return out(o)
