import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Numeric, BigInteger, Date, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    submitted_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    category = Column(String(80), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    expense_date = Column(Date, nullable=False)
    status = Column(String(30), nullable=False, default="SUBMITTED")
    reviewed_by = Column(GUID, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExpenseReceipt(Base):
    __tablename__ = "expense_receipts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    expense_id = Column(GUID, ForeignKey("expenses.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(1000), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    uploaded_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Reimbursement(Base):
    __tablename__ = "reimbursements"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    expense_id = Column(GUID, ForeignKey("expenses.id"), nullable=False, unique=True)
    paid_to = Column(GUID, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(30), nullable=False)
    payment_reference = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, default="PENDING")
    paid_at = Column(DateTime, nullable=True)
    processed_by = Column(GUID, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    transaction_type = Column(String(20), nullable=False)
    category = Column(String(60), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    description = Column(String(500), nullable=True)
    transaction_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(GUID, nullable=True)
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
