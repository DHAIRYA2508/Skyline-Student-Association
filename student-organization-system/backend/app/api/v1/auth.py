import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.auth import Organization, User, Member, MembershipPlan, Membership
from app.schemas.auth import (
    MembershipPlanResponse,
    StudentRegisterRequest,
    LoginRequest,
    AuthTokenResponse,
    UserProfileResponse,
    MembershipDetail,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Membership"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def uuid_to_str(binary_uuid) -> str:
    if isinstance(binary_uuid, bytes):
        return str(uuid.UUID(bytes=binary_uuid))
    return str(binary_uuid)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_bytes = uuid.UUID(user_id_str).bytes
    user = db.query(User).filter(User.id == user_bytes, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user


def build_membership_detail(db: Session, member_id_bytes) -> Optional[MembershipDetail]:
    membership = (
        db.query(Membership)
        .filter(Membership.member_id == member_id_bytes)
        .order_by(Membership.created_at.desc())
        .first()
    )
    if not membership:
        return None

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == membership.membership_plan_id).first()
    today = date.today()
    days_until_expiry = (membership.end_date - today).days

    dues_paid = membership.payment_status.upper() == "PAID"
    needs_renewal = (days_until_expiry <= 30) or (membership.status.upper() == "EXPIRED")

    return MembershipDetail(
        membership_id=uuid_to_str(membership.id),
        plan_name=plan.name if plan else "Standard Membership",
        start_date=membership.start_date.isoformat(),
        end_date=membership.end_date.isoformat(),
        status=membership.status.upper(),
        payment_status=membership.payment_status.upper(),
        dues_paid=dues_paid,
        event_discount_percentage=float(plan.event_discount_percentage) if plan else 0.0,
        merchandise_discount_percentage=float(plan.merchandise_discount_percentage) if plan else 0.0,
        days_until_expiry=days_until_expiry,
        needs_renewal_reminder=needs_renewal,
    )


@router.get("/plans", response_model=list[MembershipPlanResponse])
def get_membership_plans(db: Session = Depends(get_db)):
    plans = db.query(MembershipPlan).filter(MembershipPlan.is_active == True).all()
    res = []
    for p in plans:
        res.append(
            MembershipPlanResponse(
                id=uuid_to_str(p.id),
                name=p.name,
                description=p.description,
                price=float(p.price),
                currency=p.currency,
                duration_months=p.duration_months,
                event_discount_percentage=float(p.event_discount_percentage),
                merchandise_discount_percentage=float(p.merchandise_discount_percentage),
            )
        )
    return res


@router.post("/register", response_model=AuthTokenResponse)
def register_student(req: StudentRegisterRequest, db: Session = Depends(get_db)):
    org = db.query(Organization).first()
    if not org:
        raise HTTPException(status_code=400, detail="Organization context not initialized")

    # Check existing user
    existing_user = db.query(User).filter(User.organization_id == org.id, User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user_id_bytes = uuid.uuid4().bytes
    user = User(
        id=user_id_bytes,
        organization_id=org.id,
        email=req.email,
        password_hash=get_password_hash(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create Member record
    member_id_bytes = uuid.uuid4().bytes
    member = Member(
        id=member_id_bytes,
        organization_id=org.id,
        user_id=user_id_bytes,
        student_id=req.student_id,
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        phone=req.phone,
        join_date=date.today(),
        status="ACTIVE" if req.dues_paid else "PENDING",
    )
    db.add(member)
    db.flush()

    # Find chosen or default Membership Plan
    if req.membership_plan_id:
        try:
            plan_bytes = uuid.UUID(req.membership_plan_id).bytes
            plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_bytes).first()
        except ValueError:
            plan = None
    else:
        plan = db.query(MembershipPlan).filter(MembershipPlan.is_active == True).first()

    if not plan:
        plan = db.query(MembershipPlan).first()

    # Create Membership Record (1 year duration or plan duration)
    months = plan.duration_months if plan else 12
    start_date = date.today()
    # End of academic year / period
    end_date = start_date + timedelta(days=365)

    payment_status = "PAID" if req.dues_paid else "PENDING"
    membership_status = "ACTIVE" if req.dues_paid else "PENDING"

    membership = Membership(
        id=uuid.uuid4().bytes,
        organization_id=org.id,
        member_id=member_id_bytes,
        membership_plan_id=plan.id if plan else uuid.uuid4().bytes,
        start_date=start_date,
        end_date=end_date,
        status=membership_status,
        amount=plan.price if plan else 0.00,
        currency=plan.currency if plan else "USD",
        payment_status=payment_status,
    )
    db.add(membership)
    db.commit()

    # Create JWT
    user_str_id = str(uuid.UUID(bytes=user_id_bytes))
    access_token = create_access_token(subject=user_str_id)
    refresh_token = create_refresh_token(subject=user_str_id)

    membership_detail = build_membership_detail(db, member_id_bytes)

    is_admin = user.email.lower().endswith("@skyline-sa.org") or "admin" in user.email.lower()
    user_profile = UserProfileResponse(
        id=user_str_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        student_id=member.student_id,
        is_admin=is_admin,
        role="ADMIN" if is_admin else "MEMBER",
        membership=membership_detail,
    )

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_profile,
    )


@router.post("/login", response_model=AuthTokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    user_str_id = uuid_to_str(user.id)
    access_token = create_access_token(subject=user_str_id)
    refresh_token = create_refresh_token(subject=user_str_id)

    member = db.query(Member).filter(Member.user_id == user.id).first()
    membership_detail = build_membership_detail(db, member.id) if member else None

    is_admin = user.email.lower().endswith("@skyline-sa.org") or "admin" in user.email.lower()
    user_profile = UserProfileResponse(
        id=user_str_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        student_id=member.student_id if member else None,
        is_admin=is_admin,
        role="ADMIN" if is_admin else "MEMBER",
        membership=membership_detail,
    )

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_profile,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_str_id = uuid_to_str(current_user.id)
    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    membership_detail = build_membership_detail(db, member.id) if member else None

    is_admin = current_user.email.lower().endswith("@skyline-sa.org") or "admin" in current_user.email.lower()
    return UserProfileResponse(
        id=user_str_id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        student_id=member.student_id if member else None,
        is_admin=is_admin,
        role="ADMIN" if is_admin else "MEMBER",
        membership=membership_detail,
    )
