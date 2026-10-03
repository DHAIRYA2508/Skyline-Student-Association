from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, require
from app.models.merchandise import Inventory, InventoryTransaction, Product, ProductVariant
from app.schemas.requests import StockAdjustIn
from app.services import audit, orders as osvc
from app.utils.common import iso, s

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _row(db, inv: Inventory) -> dict:
    v = db.query(ProductVariant).filter(ProductVariant.id == s(inv.product_variant_id)).first()
    p = db.query(Product).filter(Product.id == s(v.product_id)).first()
    return {"variant_id": s(v.id), "product_id": s(p.id), "product_name": p.name, "sku": v.sku, "size": v.size,
            "color": v.color, "quantity": inv.quantity, "low_stock_threshold": inv.low_stock_threshold,
            "low_stock": inv.quantity <= inv.low_stock_threshold}


@router.get("")
def stock(low_only: bool = False, ctx: Ctx = Depends(require("inventory.manage", "products.manage", "orders.manage"))):
    rows = ctx.db.query(Inventory).filter(Inventory.organization_id == ctx.org_id).all()
    out = [_row(ctx.db, r) for r in rows]
    if low_only:
        out = [r for r in out if r["low_stock"]]
    return sorted(out, key=lambda r: (not r["low_stock"], r["product_name"], r["sku"]))


@router.get("/transactions")
def transactions(variant_id: str = "", limit: int = 100,
                 ctx: Ctx = Depends(require("inventory.manage", "products.manage"))):
    q = ctx.db.query(InventoryTransaction).filter(InventoryTransaction.organization_id == ctx.org_id)
    if variant_id:
        q = q.filter(InventoryTransaction.product_variant_id == variant_id)
    out = []
    for t in q.order_by(InventoryTransaction.created_at.desc()).limit(min(limit, 500)).all():
        v = ctx.db.query(ProductVariant).filter(ProductVariant.id == s(t.product_variant_id)).first()
        p = ctx.db.query(Product).filter(Product.id == s(v.product_id)).first() if v else None
        out.append({"id": s(t.id), "product_name": p.name if p else "", "sku": v.sku if v else "", "size": v.size if v else None,
                    "type": t.transaction_type, "quantity": t.quantity, "reason": t.reason, "created_at": iso(t.created_at)})
    return out


@router.post("/adjust")
def adjust(body: StockAdjustIn, ctx: Ctx = Depends(require("inventory.manage"))):
    kind = body.transaction_type.upper()
    if kind not in ("RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"):
        raise HTTPException(400, "transaction_type must be RESTOCK, ADJUSTMENT, DAMAGE or RETURN")
    v = ctx.db.query(ProductVariant).filter(ProductVariant.id == body.variant_id).first()
    p = ctx.db.query(Product).filter(Product.id == s(v.product_id)).first() if v else None
    if not v or s(p.organization_id) != ctx.org_id:
        raise HTTPException(404, "Variant not found")
    if body.quantity == 0:
        raise HTTPException(400, "Quantity must not be zero")
    delta = -abs(body.quantity) if kind == "DAMAGE" else (abs(body.quantity) if kind in ("RESTOCK", "RETURN") else body.quantity)
    inv = ctx.db.query(Inventory).filter(Inventory.product_variant_id == s(v.id)).first()
    old = inv.quantity if inv else 0
    inv = osvc.change_stock(ctx.db, ctx.org_id, v.id, delta, kind, ctx.user.id, body.reason)
    if body.low_stock_threshold is not None:
        inv.low_stock_threshold = body.low_stock_threshold
    audit.log(ctx.db, ctx, "INVENTORY_ADJUSTED", "ProductVariant", v.id, old={"quantity": old},
              new={"quantity": inv.quantity, "type": kind, "reason": body.reason})
    ctx.db.commit()
    return _row(ctx.db, inv)
