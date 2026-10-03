import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    audience_type = Column(String(50), nullable=False)
    status = Column(String(30), nullable=False, default="DRAFT")
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(GUID, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
