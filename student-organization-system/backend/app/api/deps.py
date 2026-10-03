"""Authentication + authorization dependencies. Every request resolves an org-scoped Ctx."""
from dataclasses import dataclass, field
from typing import List, Set

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.member import Member
from app.models.organization import Permission, Role, RolePermission, User, UserRole
from app.utils.common import now, s

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@dataclass
class Ctx:
    db: Session
    user: User
    org_id: str
    roles: List[str] = field(default_factory=list)
    perms: Set[str] = field(default_factory=set)
    request: Request = None

    def can(self, perm: str) -> bool:
        return perm in self.perms

    @property
    def member(self):
        return self.db.query(Member).filter(
            Member.user_id == s(self.user.id), Member.organization_id == self.org_id,
            Member.is_deleted == False).first()  # noqa: E712


def load_access(db: Session, user: User):
    uid = s(user.id)
    roles = [r for (r,) in db.query(Role.name).join(UserRole, UserRole.role_id == Role.id)
             .filter(UserRole.user_id == uid, Role.organization_id == s(user.organization_id)).all()]
    perms = {p for (p,) in db.query(Permission.code)
             .join(RolePermission, RolePermission.permission_id == Permission.id)
             .join(UserRole, UserRole.role_id == RolePermission.role_id)
             .join(Role, Role.id == UserRole.role_id)
             .filter(UserRole.user_id == uid, Role.organization_id == s(user.organization_id)).all()}
    return roles, perms


def current_ctx(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Ctx:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials",
                                 headers={"WWW-Authenticate": "Bearer"})
    user_id = decode_access_token(token)
    if not user_id:
        raise unauthorized
    user = db.query(User).filter(User.id == user_id, User.is_active == True,  # noqa: E712
                                 User.is_deleted == False).first()  # noqa: E712
    if not user:
        raise unauthorized
    roles, perms = load_access(db, user)
    return Ctx(db=db, user=user, org_id=s(user.organization_id), roles=roles, perms=perms, request=request)


def require(*perms: str):
    """Allow the request if the user holds ANY of the given permissions."""
    def dep(ctx: Ctx = Depends(current_ctx)) -> Ctx:
        if not any(p in ctx.perms for p in perms):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to do that")
        return ctx
    return dep


def get_or_404(db: Session, model, obj_id: str, org_id: str, org_field: str = "organization_id"):
    try:
        row = db.query(model).filter(model.id == obj_id).first()
    except Exception:
        row = None
    if row is None or (org_field and s(getattr(row, org_field)) != org_id):
        raise HTTPException(404, f"{model.__name__} not found")
    return row
