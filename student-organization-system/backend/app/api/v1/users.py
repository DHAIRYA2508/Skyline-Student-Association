from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func

from app.api.deps import Ctx, get_or_404, load_access, require
from app.core.permissions import ROLES
from app.core.security import get_password_hash
from app.models.member import Member
from app.models.organization import Role, User, UserRole
from app.schemas.requests import RoleAssignIn, UserCreateIn
from app.services import audit
from app.utils.common import iso, new_id, s

router = APIRouter(prefix="/users", tags=["Users & Roles"])


def user_out(db, u: User) -> dict:
    roles, _ = load_access(db, u)
    return {"id": s(u.id), "email": u.email, "first_name": u.first_name, "last_name": u.last_name, "is_active": u.is_active,
            "roles": roles, "last_login_at": iso(u.last_login_at)}


def _set_roles(db, ctx: Ctx, user: User, names):
    bad = [n for n in names if n not in ROLES]
    if bad:
        raise HTTPException(400, f"Unknown roles: {bad}")
    if "SUPER_ADMIN" in names and "SUPER_ADMIN" not in ctx.roles:
        raise HTTPException(403, "Only a Super Admin can grant SUPER_ADMIN")
    for ur in db.query(UserRole).filter(UserRole.user_id == s(user.id)).all():
        db.delete(ur)
    db.flush()
    for n in set(names) | {"MEMBER"}:
        role = db.query(Role).filter(Role.organization_id == ctx.org_id, Role.name == n).first()
        db.add(UserRole(user_id=s(user.id), role_id=s(role.id)))
    db.flush()


@router.get("")
def list_users(ctx: Ctx = Depends(require("users.manage"))):
    rows = ctx.db.query(User).filter(User.organization_id == ctx.org_id, User.is_deleted == False).order_by(User.created_at).all()  # noqa: E712
    return [user_out(ctx.db, u) for u in rows]


@router.get("/roles")
def roles(ctx: Ctx = Depends(require("users.manage"))):
    return [{"name": k, "description": v[0], "permissions": v[1]} for k, v in ROLES.items()]


@router.post("", status_code=201)
def create_user(body: UserCreateIn, ctx: Ctx = Depends(require("users.manage"))):
    if ctx.db.query(User).filter(User.organization_id == ctx.org_id, func.lower(User.email) == body.email.lower()).first():
        raise HTTPException(409, "Email already in use")
    u = User(id=new_id(), organization_id=ctx.org_id, email=body.email.lower(), password_hash=get_password_hash(body.password),
             first_name=body.first_name, last_name=body.last_name)
    ctx.db.add(u)
    ctx.db.flush()
    _set_roles(ctx.db, ctx, u, body.roles)
    audit.log(ctx.db, ctx, "USER_CREATED", "User", u.id, new={"email": u.email, "roles": body.roles})
    ctx.db.commit()
    return user_out(ctx.db, u)


@router.put("/{user_id}/roles")
def assign_roles(user_id: str, body: RoleAssignIn, ctx: Ctx = Depends(require("users.manage"))):
    u = get_or_404(ctx.db, User, user_id, ctx.org_id)
    old = user_out(ctx.db, u)["roles"]
    if s(u.id) == s(ctx.user.id) and "SUPER_ADMIN" in old and "SUPER_ADMIN" not in body.roles:
        raise HTTPException(409, "You cannot remove your own Super Admin role")
    _set_roles(ctx.db, ctx, u, body.roles)
    audit.log(ctx.db, ctx, "ROLES_CHANGED", "User", u.id, old={"roles": old}, new={"roles": body.roles})
    ctx.db.commit()
    return user_out(ctx.db, u)


@router.patch("/{user_id}/active")
def set_active(user_id: str, active: bool, ctx: Ctx = Depends(require("users.manage"))):
    u = get_or_404(ctx.db, User, user_id, ctx.org_id)
    if s(u.id) == s(ctx.user.id):
        raise HTTPException(409, "You cannot deactivate yourself")
    u.is_active = active
    audit.log(ctx.db, ctx, "USER_ACTIVATED" if active else "USER_DEACTIVATED", "User", u.id)
    ctx.db.commit()
    return user_out(ctx.db, u)
