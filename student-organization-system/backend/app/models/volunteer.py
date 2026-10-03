import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Numeric, Date, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class VolunteerProfile(Base):
    __tablename__ = "volunteer_profiles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    member_id = Column(GUID, ForeignKey("members.id"), nullable=False, unique=True)
    availability = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="ACTIVE")
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Fundraiser(Base):
    __tablename__ = "fundraisers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Numeric(12, 2), nullable=False)
    amount_raised = Column(Numeric(12, 2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="USD")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    status = Column(String(30), nullable=False, default="PLANNED")
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    fundraiser_id = Column(GUID, ForeignKey("fundraisers.id"), nullable=True)
    event_id = Column(GUID, ForeignKey("events.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), nullable=False, default="MEDIUM")
    status = Column(String(30), nullable=False, default="TODO")
    due_date = Column(DateTime, nullable=True)
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    task_id = Column(GUID, ForeignKey("tasks.id"), nullable=False)
    volunteer_id = Column(GUID, ForeignKey("volunteer_profiles.id"), nullable=False)
    assigned_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
