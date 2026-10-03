import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey
from app.db.session import Base
from app.models.types import GUID


class Product(Base):
    __tablename__ = "products"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(80), nullable=True)
    image_url = Column(String(500), nullable=True)
    base_price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID, ForeignKey("products.id"), nullable=False)
    sku = Column(String(100), nullable=False, unique=True)
    size = Column(String(20), nullable=True)
    color = Column(String(50), nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    product_variant_id = Column(GUID, ForeignKey("product_variants.id"), nullable=False, unique=True)
    quantity = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=False, default=5)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=False)
    product_variant_id = Column(GUID, ForeignKey("product_variants.id"), nullable=False)
    transaction_type = Column(String(30), nullable=False)
    quantity = Column(Integer, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(GUID, nullable=True)
    reason = Column(String(255), nullable=True)
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
