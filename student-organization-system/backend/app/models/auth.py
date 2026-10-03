import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Numeric, Integer, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import BINARY
from app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(BINARY(16), primary_key=True, default=lambda: uuid.uuid4().bytes)
    name = Column(String(150), nullable=False)
    slug = Column(String(180), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(BINARY(16), primary_key=True, default=lambda: uuid.uuid4().bytes)
    organization_id = Column(BINARY(16), ForeignKey("organizations.id"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    password_algorithm = Column(String(30), default="bcrypt", nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    member = relationship("Member", back_populates="user", uselist=False)


class Member(Base):
    __tablename__ = "members"

    id = Column(BINARY(16), primary_key=True, default=lambda: uuid.uuid4().bytes)
    organization_id = Column(BINARY(16), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(BINARY(16), ForeignKey("users.id"), nullable=True)
    student_id = Column(String(50), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    join_date = Column(Date, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)
    profile_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="member")
    memberships = relationship("Membership", back_populates="member")


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(BINARY(16), primary_key=True, default=lambda: uuid.uuid4().bytes)
    organization_id = Column(BINARY(16), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), default=0.00, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    duration_months = Column(Integer, nullable=False)
    event_discount_percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    merchandise_discount_percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    memberships = relationship("Membership", back_populates="plan")


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(BINARY(16), primary_key=True, default=lambda: uuid.uuid4().bytes)
    organization_id = Column(BINARY(16), ForeignKey("organizations.id"), nullable=False)
    member_id = Column(BINARY(16), ForeignKey("members.id"), nullable=False)
    membership_plan_id = Column(BINARY(16), ForeignKey("membership_plans.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    payment_status = Column(String(30), default="PENDING", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    member = relationship("Member", back_populates="memberships")
    plan = relationship("MembershipPlan", back_populates="memberships")
