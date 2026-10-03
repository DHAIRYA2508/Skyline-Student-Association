import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.types import GUID


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False)
    slug = Column(String(180), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    academic_year = Column(String(20), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(GUID, ForeignKey("users.id"), nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    password_algorithm = Column(String(30), nullable=False, default="bcrypt")
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(GUID, ForeignKey("users.id"), nullable=True)


class Role(Base):
    __tablename__ = "roles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(80), nullable=False)
    description = Column(String(255), nullable=True)
    is_system_role = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    code = Column(String(100), nullable=False, unique=True)
    module = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(GUID, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(GUID, ForeignKey("permissions.id"), primary_key=True)


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(GUID, ForeignKey("users.id"), primary_key=True)
    role_id = Column(GUID, ForeignKey("roles.id"), primary_key=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True)
    family_id = Column(GUID, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
