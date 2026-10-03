"""Request schemas (Pydantic v2) for all modules."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    student_id: str = Field(min_length=2, max_length=50)
    phone: Optional[str] = None
    organization_slug: Optional[str] = None


class LoginIn(BaseModel):
    email: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class PlanIn(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal = Field(ge=0)
    duration_months: int = Field(ge=1, le=60)
    event_discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    merchandise_discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    benefits: List[str] = []
    is_active: bool = True


class JoinIn(BaseModel):
    plan_id: str
    payment_method: str = "CARD"
    student_id: Optional[str] = None
    phone: Optional[str] = None


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None


class EventIn(BaseModel):
    name: str = Field(min_length=2)
    description: Optional[str] = None
    venue: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    capacity: int = Field(ge=1)
    member_price: Decimal = Field(ge=0)
    non_member_price: Decimal = Field(ge=0)

    @field_validator("end_datetime")
    @classmethod
    def _end_after_start(cls, v, info):
        start = info.data.get("start_datetime")
        if start and v < start:
            raise ValueError("end_datetime must be after start_datetime")
        return v


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    capacity: Optional[int] = Field(default=None, ge=1)
    member_price: Optional[Decimal] = Field(default=None, ge=0)
    non_member_price: Optional[Decimal] = Field(default=None, ge=0)


class TicketBuyIn(BaseModel):
    event_id: str
    quantity: int = Field(default=1, ge=1, le=10)
    payment_method: str = "CARD"
    buyer_name: Optional[str] = None
    buyer_email: Optional[EmailStr] = None
    member_lookup: Optional[str] = None  # staff door sales: student id / email of a member


class CheckInIn(BaseModel):
    code: str
    method: str = "MANUAL"  # MANUAL | QR


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=1)
    audience_type: str = "ALL"
    publish: bool = False


class VariantIn(BaseModel):
    sku: str
    size: Optional[str] = None
    color: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, ge=0)
    quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class ProductIn(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    base_price: Decimal = Field(ge=0)
    variants: List[VariantIn] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    base_price: Optional[Decimal] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class StockAdjustIn(BaseModel):
    variant_id: str
    transaction_type: str  # RESTOCK | ADJUSTMENT | DAMAGE | RETURN
    quantity: int  # positive amount; for ADJUSTMENT may be negative
    reason: Optional[str] = None
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)


class OrderItemIn(BaseModel):
    variant_id: str
    quantity: int = Field(ge=1, le=20)


class OrderIn(BaseModel):
    items: List[OrderItemIn] = Field(min_length=1)
    payment_method: str = "CARD"


class OrderStatusIn(BaseModel):
    status: str


class VolunteerJoinIn(BaseModel):
    skills: Optional[str] = None
    availability: Optional[str] = None


class FundraiserIn(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: Decimal = Field(gt=0)
    start_date: date
    end_date: Optional[date] = None
    status: str = "ACTIVE"


class FundraiserUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[Decimal] = Field(default=None, gt=0)
    end_date: Optional[date] = None
    status: Optional[str] = None


class DonationIn(BaseModel):
    amount: Decimal = Field(gt=0)
    description: Optional[str] = None
    payment_method: str = "CASH"


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    due_date: Optional[datetime] = None
    fundraiser_id: Optional[str] = None
    event_id: Optional[str] = None
    volunteer_ids: List[str] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None


class AssignIn(BaseModel):
    volunteer_id: str


class ReceiptIn(BaseModel):
    file_name: str
    file_url: str
    mime_type: str = "application/octet-stream"
    file_size: Optional[int] = None


class ExpenseIn(BaseModel):
    category: str
    description: str = Field(min_length=2)
    amount: Decimal = Field(gt=0)
    expense_date: date
    receipts: List[ReceiptIn] = []


class ExpenseReviewIn(BaseModel):
    action: str  # START_REVIEW | APPROVE | REJECT
    reason: Optional[str] = None


class ReimburseIn(BaseModel):
    payment_method: str = "BANK_TRANSFER"
    payment_reference: Optional[str] = None


class TransactionIn(BaseModel):
    transaction_type: str
    category: str
    amount: Decimal = Field(gt=0)
    description: Optional[str] = None
    transaction_date: Optional[datetime] = None


class ReverseIn(BaseModel):
    reason: str = Field(min_length=2)


class RoleAssignIn(BaseModel):
    roles: List[str]


class UserCreateIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    roles: List[str] = ["MEMBER"]


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    academic_year: Optional[str] = None
