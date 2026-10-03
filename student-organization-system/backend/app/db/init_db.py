import uuid
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.db.session import engine, Base
import app.models  # noqa: F401
from app.models.organization import Organization, User
from app.models.member import Member, MembershipPlan, Membership
from app.core.security import get_password_hash


def init_db(db: Session) -> None:
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # 1. Ensure Organization exists
    org = db.query(Organization).first()
    if not org:
        org = Organization(
            id=uuid.uuid4(),
            name="Skyline Student Association",
            slug="skyline-student-association",
            email="contact@skyline-sa.org",
            description="Primary student body organization representing all students at Skyline Campus.",
            is_active=True,
        )
        db.add(org)
        db.commit()
        db.refresh(org)

    # 2. Ensure MembershipPlan exists
    plan = db.query(MembershipPlan).first()
    if not plan:
        plan = MembershipPlan(
            id=uuid.uuid4(),
            organization_id=org.id,
            name="Gold Annual Membership",
            description="Full annual membership access with priority event seating and 15% merch discount.",
            price=25.00,
            currency="USD",
            duration_months=12,
            event_discount_percentage=20.00,
            merchandise_discount_percentage=15.00,
            is_active=True,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

    # 3. Seed Demo Users
    demo_users = [
        {
            "email": "contact@skyline-sa.org",
            "password": "admin123",
            "first_name": "Skyline",
            "last_name": "Admin",
            "student_id": "SKY-00001",
        },
        {
            "email": "admin@skyline-sa.org",
            "password": "admin123",
            "first_name": "Alex",
            "last_name": "Administrator",
            "student_id": "S10293847",
        },
        {
            "email": "john.doe@skyline.edu",
            "password": "password123",
            "first_name": "John",
            "last_name": "Doe",
            "student_id": "SKY-89201",
        },
    ]

    for demo in demo_users:
        user = db.query(User).filter(User.email == demo["email"]).first()
        if not user:
            user_id = uuid.uuid4()
            user = User(
                id=user_id,
                organization_id=org.id,
                email=demo["email"],
                password_hash=get_password_hash(demo["password"]),
                password_algorithm="bcrypt",
                first_name=demo["first_name"],
                last_name=demo["last_name"],
                is_active=True,
            )
            db.add(user)
            db.flush()

            member = db.query(Member).filter(Member.user_id == user.id).first()
            if not member:
                member_id = uuid.uuid4()
                member = Member(
                    id=member_id,
                    organization_id=org.id,
                    user_id=user.id,
                    student_id=demo["student_id"],
                    first_name=demo["first_name"],
                    last_name=demo["last_name"],
                    email=demo["email"],
                    join_date=date.today(),
                    status="ACTIVE",
                )
                db.add(member)
                db.flush()

            membership = db.query(Membership).filter(Membership.member_id == member.id).first()
            if not membership:
                start_date = date.today()
                end_date = start_date + timedelta(days=365)
                membership = Membership(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    member_id=member.id,
                    membership_plan_id=plan.id,
                    start_date=start_date,
                    end_date=end_date,
                    status="ACTIVE",
                    amount=plan.price,
                    currency=plan.currency,
                    payment_status="PAID",
                )
                db.add(membership)
            db.commit()
