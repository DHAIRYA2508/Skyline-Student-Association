from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.member import Member
from app.models.order import Order, OrderItem
from app.schemas.requests import OrderIn, OrderStatusIn
from app.services import audit, orders as osvc
from app.utils.common import iso, money, s

router = APIRouter(prefix="/orders", tags=["Orders"])


def order_out(db, o: Order) -> dict:
    items = db.query(OrderItem).filter(OrderItem.order_id == s(o.id)).all()
    m = db.query(Member).filter(Member.id == s(o.member_id)).first() if o.member_id else None
    return {"id": s(o.id), "order_number": o.order_number, "status": o.status, "payment_status": o.payment_status,
            "payment_method": o.payment_method, "subtotal": money(o.subtotal), "discount_amount": money(o.discount_amount),
            "total_amount": money(o.total_amount), "created_at": iso(o.created_at),
            "customer": f"{m.first_name} {m.last_name}" if m else "Walk-in",
            "items": [{"name": i.product_name_snapshot, "variant": i.variant_snapshot, "quantity": i.quantity,
                       "unit_price": money(i.unit_price), "total_price": money(i.total_price)} for i in items]}


@router.post("", status_code=201)
def place(body: OrderIn, ctx: Ctx = Depends(current_ctx)):
    merged = {}
    for it in body.items:  # merge duplicate lines
        merged[it.variant_id] = merged.get(it.variant_id, 0) + it.quantity
    from app.schemas.requests import OrderItemIn
    items = [OrderItemIn(variant_id=k, quantity=v) for k, v in merged.items()]
    o = osvc.place_order(ctx.db, ctx, items, body.payment_method, ctx.member)
    audit.log(ctx.db, ctx, "ORDER_PLACED", "Order", o.id, new={"number": o.order_number, "total": money(o.total_amount)})
    ctx.db.commit()
    return order_out(ctx.db, o)


@router.get("/mine")
def mine(ctx: Ctx = Depends(current_ctx)):
    m = ctx.member
    if not m:
        return []
    rows = ctx.db.query(Order).filter(Order.organization_id == ctx.org_id, Order.member_id == s(m.id)) \
        .order_by(Order.created_at.desc()).all()
    return [order_out(ctx.db, o) for o in rows]


@router.get("")
def all_orders(status: str = "", ctx: Ctx = Depends(require("orders.manage"))):
    q = ctx.db.query(Order).filter(Order.organization_id == ctx.org_id)
    if status:
        q = q.filter(Order.status == status.upper())
    return [order_out(ctx.db, o) for o in q.order_by(Order.created_at.desc()).limit(300).all()]


@router.post("/{order_id}/status")
def set_status(order_id: str, body: OrderStatusIn, ctx: Ctx = Depends(require("orders.manage"))):
    o = get_or_404(ctx.db, Order, order_id, ctx.org_id)
    old = o.status
    osvc.set_status(ctx.db, ctx, o, body.status)
    audit.log(ctx.db, ctx, f"ORDER_{o.status}", "Order", o.id, old={"status": old}, new={"status": o.status})
    ctx.db.commit()
    return order_out(ctx.db, o)
