from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.merchandise import Inventory, Product, ProductVariant
from app.schemas.requests import ProductIn, ProductUpdate, VariantIn
from app.services import audit, orders as osvc
from app.utils.common import money, new_id, q, s

router = APIRouter(prefix="/products", tags=["Merchandise"])


def product_out(db: Session, p: Product, staff: bool, pct: float = 0) -> dict:
    variants = []
    for v in db.query(ProductVariant).filter(ProductVariant.product_id == s(p.id)).order_by(ProductVariant.created_at).all():
        inv = db.query(Inventory).filter(Inventory.product_variant_id == s(v.id)).first()
        qty = inv.quantity if inv else 0
        d = {"id": s(v.id), "sku": v.sku, "size": v.size, "color": v.color, "price": money(v.price),
             "member_price": money(q(v.price) * (100 - q(pct)) / 100), "in_stock": qty > 0,
             "quantity": qty if staff else min(qty, 10), "is_active": v.is_active}
        if staff:
            d["low_stock_threshold"] = inv.low_stock_threshold if inv else 0
            d["low_stock"] = bool(inv and inv.quantity <= inv.low_stock_threshold)
        variants.append(d)
    return {"id": s(p.id), "name": p.name, "description": p.description, "category": p.category, "image_url": p.image_url,
            "base_price": money(p.base_price), "is_active": p.is_active, "variants": variants,
            "total_stock": sum(v["quantity"] for v in variants) if staff else None}


def _add_variant(db, ctx, p: Product, v: VariantIn):
    if db.query(ProductVariant).filter(ProductVariant.sku == v.sku).first():
        raise HTTPException(409, f"SKU {v.sku} already exists")
    row = ProductVariant(id=new_id(), product_id=s(p.id), sku=v.sku, size=v.size, color=v.color,
                         price=v.price if v.price is not None else p.base_price)
    db.add(row)
    db.flush()
    db.add(Inventory(id=new_id(), organization_id=ctx.org_id, product_variant_id=s(row.id), quantity=0,
                     low_stock_threshold=v.low_stock_threshold))
    db.flush()
    if v.quantity:
        osvc.change_stock(db, ctx.org_id, row.id, v.quantity, "RESTOCK", ctx.user.id, "Initial stock")
    return row


@router.get("")
def list_products(include_inactive: bool = False, ctx: Ctx = Depends(current_ctx)):
    staff = ctx.can("products.manage") or ctx.can("inventory.manage")
    qry = ctx.db.query(Product).filter(Product.organization_id == ctx.org_id)
    if not (staff and include_inactive):
        qry = qry.filter(Product.is_active == True)  # noqa: E712
    pct = float(osvc.merch_discount_pct(ctx.db, ctx.member))
    return [product_out(ctx.db, p, staff, pct) for p in qry.order_by(Product.name).all()]


@router.post("", status_code=201)
def create(body: ProductIn, ctx: Ctx = Depends(require("products.manage"))):
    p = Product(id=new_id(), organization_id=ctx.org_id, **body.model_dump(exclude={"variants"}))
    ctx.db.add(p)
    ctx.db.flush()
    for v in body.variants:
        _add_variant(ctx.db, ctx, p, v)
    audit.log(ctx.db, ctx, "PRODUCT_CREATED", "Product", p.id, new=body.model_dump())
    ctx.db.commit()
    return product_out(ctx.db, p, True)


@router.patch("/{product_id}")
def update(product_id: str, body: ProductUpdate, ctx: Ctx = Depends(require("products.manage"))):
    p = get_or_404(ctx.db, Product, product_id, ctx.org_id)
    old = product_out(ctx.db, p, True)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    audit.log(ctx.db, ctx, "PRODUCT_UPDATED", "Product", p.id, old={"name": old["name"], "base_price": old["base_price"]},
              new=body.model_dump(exclude_none=True))
    ctx.db.commit()
    return product_out(ctx.db, p, True)


@router.post("/{product_id}/variants", status_code=201)
def add_variant(product_id: str, body: VariantIn, ctx: Ctx = Depends(require("products.manage"))):
    p = get_or_404(ctx.db, Product, product_id, ctx.org_id)
    _add_variant(ctx.db, ctx, p, body)
    audit.log(ctx.db, ctx, "VARIANT_ADDED", "Product", p.id, new=body.model_dump())
    ctx.db.commit()
    return product_out(ctx.db, p, True)
