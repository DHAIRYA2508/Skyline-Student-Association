from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.member import Member
from app.models.organization import Role, UserRole
from app.models.volunteer import TaskAssignment, VolunteerProfile
from app.schemas.requests import VolunteerJoinIn
from app.services import audit
from app.utils.common import iso, new_id, s

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])


def vol_out(db, v: VolunteerProfile) -> dict:
    m = db.query(Member).filter(Member.id == s(v.member_id)).first()
    assigned = db.query(TaskAssignment).filter(TaskAssignment.volunteer_id == s(v.id)).all()
    done = len([a for a in assigned if a.completed_at])
    return {"id": s(v.id), "member_id": s(v.member_id), "name": f"{m.first_name} {m.last_name}" if m else "",
            "email": m.email if m else "", "skills": v.skills, "availability": v.availability, "status": v.status,
            "joined_at": iso(v.joined_at), "tasks_assigned": len(assigned), "tasks_done": done}


@router.get("")
def list_volunteers(ctx: Ctx = Depends(require("volunteers.manage", "tasks.manage", "fundraisers.manage"))):
    rows = ctx.db.query(VolunteerProfile).filter(VolunteerProfile.organization_id == ctx.org_id).all()
    return [vol_out(ctx.db, v) for v in rows]


@router.get("/me")
def my_profile(ctx: Ctx = Depends(current_ctx)):
    m = ctx.member
    v = ctx.db.query(VolunteerProfile).filter(VolunteerProfile.member_id == s(m.id)).first() if m else None
    return vol_out(ctx.db, v) if v else None


@router.post("/join", status_code=201)
def join(body: VolunteerJoinIn, ctx: Ctx = Depends(current_ctx)):
    """A member signs up as a volunteer (creates profile, grants VOLUNTEER role)."""
    m = ctx.member
    if not m:
        raise HTTPException(400, "Only members can volunteer")
    v = ctx.db.query(VolunteerProfile).filter(VolunteerProfile.member_id == s(m.id)).first()
    if v:
        v.skills, v.availability, v.status = body.skills or v.skills, body.availability or v.availability, "ACTIVE"
    else:
        v = VolunteerProfile(id=new_id(), organization_id=ctx.org_id, member_id=s(m.id), skills=body.skills,
                             availability=body.availability)
        ctx.db.add(v)
    role = ctx.db.query(Role).filter(Role.organization_id == ctx.org_id, Role.name == "VOLUNTEER").first()
    if role and not ctx.db.query(UserRole).filter(UserRole.user_id == s(ctx.user.id), UserRole.role_id == s(role.id)).first():
        ctx.db.add(UserRole(user_id=s(ctx.user.id), role_id=s(role.id)))
    audit.log(ctx.db, ctx, "VOLUNTEER_JOINED", "VolunteerProfile", v.id, new=body.model_dump())
    ctx.db.commit()
    return vol_out(ctx.db, v)


@router.patch("/{vol_id}/status")
def set_status(vol_id: str, status: str, ctx: Ctx = Depends(require("volunteers.manage"))):
    v = get_or_404(ctx.db, VolunteerProfile, vol_id, ctx.org_id)
    if status.upper() not in ("ACTIVE", "INACTIVE"):
        raise HTTPException(400, "status must be ACTIVE or INACTIVE")
    v.status = status.upper()
    audit.log(ctx.db, ctx, "VOLUNTEER_STATUS", "VolunteerProfile", v.id, new={"status": v.status})
    ctx.db.commit()
    return vol_out(ctx.db, v)
