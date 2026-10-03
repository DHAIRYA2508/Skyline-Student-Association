from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class MembershipPlanResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    duration_months: int
    event_discount_percentage: float
    merchandise_discount_percentage: float

    class Config:
        from_attributes = True


class StudentRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    first_name: str
    last_name: str
    student_id: str
    phone: Optional[str] = None
    membership_plan_id: Optional[str] = None
    dues_paid: bool = True  # True if dues paid on campus table / during registration


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MembershipDetail(BaseModel):
    membership_id: str
    plan_name: str
    start_date: str
    end_date: str
    status: str
    payment_status: str
    dues_paid: bool
    event_discount_percentage: float
    merchandise_discount_percentage: float
    days_until_expiry: int
    needs_renewal_reminder: bool


class UserProfileResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    student_id: Optional[str] = None
    is_admin: bool = False
    role: str = "MEMBER"
    membership: Optional[MembershipDetail] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class MemberVerificationResponse(BaseModel):
    found: bool
    student_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    is_member: bool
    membership_status: str
    dues_paid: bool
    payment_status: str
    plan_name: Optional[str] = None
    event_discount_percentage: float = 0.0
    merchandise_discount_percentage: float = 0.0
    end_date: Optional[str] = None
    days_until_expiry: Optional[int] = None
    needs_renewal_reminder: bool = False
