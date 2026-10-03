import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class Event(Base):
    __tablename__ = "events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    venue = Column(String(255), nullable=True)
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False)
    member_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    non_member_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="USD")
    registration_start = Column(DateTime, nullable=True)
    registration_end = Column(DateTime, nullable=True)
    status = Column(String(30), nullable=False, default="DRAFT")
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(GUID, ForeignKey("users.id"), nullable=True)


class EventTicket(Base):
    __tablename__ = "event_tickets"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    event_id = Column(GUID, ForeignKey("events.id"), nullable=False)
    member_id = Column(GUID, ForeignKey("members.id"), nullable=True)
    buyer_name = Column(String(200), nullable=False)
    buyer_email = Column(String(255), nullable=False)
    ticket_code = Column(String(100), nullable=False, unique=True)
    qr_token = Column(String(255), nullable=False, unique=True)
    ticket_type = Column(String(30), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    payment_status = Column(String(30), nullable=False, default="PENDING")
    status = Column(String(30), nullable=False, default="RESERVED")
    purchased_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class EventCheckin(Base):
    __tablename__ = "event_checkins"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID, ForeignKey("events.id"), nullable=False)
    ticket_id = Column(GUID, ForeignKey("event_tickets.id"), nullable=False, unique=True)
    checked_in_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    checked_in_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    method = Column(String(20), nullable=False)
