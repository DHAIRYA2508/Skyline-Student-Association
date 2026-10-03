from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import Ctx, current_ctx, load_access
from app.core.config import settings
from app.core.security import (create_access_token, generate_refresh_token, get_password_hash, hash_token,
                               verify_password)
from app.db.session import get_db
from app.models.member import Member
from app.models.organization import Organization, RefreshToken, Role, User, UserRole
from app.schemas.requests import LoginIn, RefreshIn, RegisterIn
from app.services import audit, membership as msvc
from app.utils.common import new_id, now, s

router = APIRouter(prefix="/auth", tags=["Authentication"])


def profile(db: Session, user: User) -> dict:
    roles, perms = load_access(db, user)
    member = db.query(Member).filter(Member.user_id == s(user.id), Member.is_deleted == False).first()  # noqa: E712
    return {
        "id": s(user.id), "email": user.email, "first_name": user.first_name, "last_name": user.last_name,
        "phone": user.phone, "organization_id": s(user.organization_id), "roles": roles,
        "permissions": sorted(perms), "is_staff": any(r not in ("MEMBER", "VOLUNTEER") for r in roles),
        "member_id": s(member.id) if member else None, "student_id": member.student_id if member else None,
        "membership": msvc.summary(db, member) if member else None,
    }


def issue_tokens(db: Session, user: User, request: Request, family_id=None) -> dict:
    refresh = generate_refresh_token()
    db.add(RefreshToken(id=new_id(), user_id=s(user.id), token_hash=hash_token(refresh), family_id=family_id or new_id(),
                        expires_at=now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                        device_info=(request.headers.get("user-agent") or "")[:500],
                        ip_address=request.client.host if request.client else None))
    return {"access_token": create_access_token(s(user.id)), "refresh_token": refresh, "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60}


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)):
    q = db.query(Organization).filter(Organization.is_active == True)  # noqa: E712
    org = q.filter(Organization.slug == body.organization_slug).first() if body.organization_slug else q.order_by(Organization.created_at).first()
    if not org:
        raise HTTPException(400, "Organization not found")
    email = body.email.lower()
    if db.query(User).filter(User.organization_id == s(org.id), func.lower(User.email) == email).first():
        raise HTTPException(409, "An account with this email already exists")
    if db.query(Member).filter(Member.organization_id == s(org.id), Member.student_id == body.student_id).first():
        raise HTTPException(409, "This student ID is already registered")
    user = User(id=new_id(), organization_id=s(org.id), email=email, password_hash=get_password_hash(body.password),
                password_algorithm="bcrypt", first_name=body.first_name, last_name=body.last_name, phone=body.phone)
    db.add(user)
    db.flush()
    db.add(Member(id=new_id(), organization_id=s(org.id), user_id=s(user.id), student_id=body.student_id,
                  first_name=body.first_name, last_name=body.last_name, email=email, phone=body.phone,
                  join_date=datetime.utcnow().date(), status="PENDING"))
    role = db.query(Role).filter(Role.organization_id == s(org.id), Role.name == "MEMBER").first()
    if role:
        db.add(UserRole(user_id=s(user.id), role_id=s(role.id)))
    db.flush()
    audit.log(db, None, "USER_REGISTERED", "User", user.id, new={"email": email}, org_id=org.id, actor_id=user.id)
    tokens = issue_tokens(db, user, request)
    db.commit()
    return {**tokens, "user": profile(db, user)}


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == body.email.strip().lower(),
                                 User.is_deleted == False).first()  # noqa: E712
    bad = HTTPException(401, "Incorrect email or password")
    if not user:
        raise bad
    if user.locked_until and user.locked_until > now():
        raise HTTPException(423, "Account temporarily locked after too many failed attempts. Try again later.")
    if not user.is_active or not verify_password(body.password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = now() + timedelta(minutes=settings.LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
        db.commit()
        raise bad
    user.failed_login_attempts, user.locked_until, user.last_login_at = 0, None, now()
    msvc.sweep(db, user.organization_id)
    tokens = issue_tokens(db, user, request)
    db.commit()
    return {**tokens, "user": profile(db, user)}


@router.post("/refresh")
def refresh(body: RefreshIn, request: Request, db: Session = Depends(get_db)):
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(body.refresh_token)).first()
    if not row:
        raise HTTPException(401, "Invalid refresh token")
    if row.revoked_at is not None:
        # reuse of a rotated token => assume theft, kill the whole family
        for t in db.query(RefreshToken).filter(RefreshToken.family_id == s(row.family_id)).all():
            t.revoked_at = t.revoked_at or now()
        db.commit()
        raise HTTPException(401, "Refresh token has been revoked")
    if row.expires_at < now():
        raise HTTPException(401, "Refresh token expired")
    user = db.query(User).filter(User.id == s(row.user_id), User.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(401, "User is inactive")
    row.revoked_at = now()
    tokens = issue_tokens(db, user, request, family_id=s(row.family_id))
    db.commit()
    return tokens


@router.post("/logout")
def logout(body: RefreshIn, db: Session = Depends(get_db)):
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(body.refresh_token)).first()
    if row:
        for t in db.query(RefreshToken).filter(RefreshToken.family_id == s(row.family_id)).all():
            t.revoked_at = t.revoked_at or now()
        db.commit()
    return {"ok": True}


@router.get("/me")
def me(ctx: Ctx = Depends(current_ctx)):
    return profile(ctx.db, ctx.user)
