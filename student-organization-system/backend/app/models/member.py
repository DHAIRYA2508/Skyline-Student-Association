import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, Date, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class Member(Base):
    __tablename__ = "members"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=True)
    student_id = Column(String(50), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    join_date = Column(Date, nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")
    profile_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(GUID, ForeignKey("users.id"), nullable=True)


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="INR")
    duration_months = Column(Integer, nullable=False)
    event_discount_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    merchandise_discount_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    member_id = Column(GUID, ForeignKey("members.id"), nullable=False)
    membership_plan_id = Column(GUID, ForeignKey("membership_plans.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    payment_status = Column(String(30), nullable=False, default="PENDING")
    renewed_from_id = Column(GUID, ForeignKey("memberships.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class MembershipPayment(Base):
    __tablename__ = "membership_payments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    membership_id = Column(GUID, ForeignKey("memberships.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    payment_method = Column(String(30), nullable=False)
    payment_reference = Column(String(150), nullable=True, unique=True)
    status = Column(String(30), nullable=False, default="PENDING")
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class MembershipBenefit(Base):
    __tablename__ = "membership_benefits"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    membership_plan_id = Column(GUID, ForeignKey("membership_plans.id"), nullable=False)
    benefit_type = Column(String(50), nullable=False)
    benefit_value = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
