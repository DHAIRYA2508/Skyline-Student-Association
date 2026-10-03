import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class Order(Base):
    __tablename__ = "orders"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    member_id = Column(GUID, ForeignKey("members.id"), nullable=True)
    order_number = Column(String(50), nullable=False, unique=True)
    subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    status = Column(String(30), nullable=False, default="PENDING")
    payment_status = Column(String(30), nullable=False, default="PENDING")
    payment_method = Column(String(30), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    order_id = Column(GUID, ForeignKey("orders.id"), nullable=False)
    product_variant_id = Column(GUID, ForeignKey("product_variants.id"), nullable=False)
    product_name_snapshot = Column(String(150), nullable=False)
    variant_snapshot = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_price = Column(Numeric(12, 2), nullable=False)


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    order_id = Column(GUID, ForeignKey("orders.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    payment_method = Column(String(30), nullable=False)
    payment_reference = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, default="PENDING")
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
