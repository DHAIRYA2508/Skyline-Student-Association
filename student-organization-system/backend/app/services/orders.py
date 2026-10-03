from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.merchandise import Inventory, InventoryTransaction, Product, ProductVariant
from app.models.member import Member
from app.models.order import Order, OrderItem, OrderPayment
from app.services import ledger, membership as msvc
from app.models.member import MembershipPlan, Membership
from app.utils.common import D, new_id, now, q, s, token_code


def add_inventory_tx(db, org_id, variant_id, kind, qty, user_id, reason=None, ref_type=None, ref_id=None):
    db.add(InventoryTransaction(id=new_id(), organization_id=s(org_id), product_variant_id=s(variant_id),
                                transaction_type=kind, quantity=qty, reference_type=ref_type,
                                reference_id=s(ref_id), reason=reason, created_by=s(user_id)))


def change_stock(db: Session, org_id, variant_id, delta: int, kind: str, user_id, reason=None,
                 ref_type=None, ref_id=None) -> Inventory:
    """Single choke-point for stock. Never lets quantity go below zero."""
    inv = db.query(Inventory).filter(Inventory.product_variant_id == s(variant_id),
                                     Inventory.organization_id == s(org_id)).with_for_update().first()
    if not inv:
        raise HTTPException(404, "Inventory record not found")
    if inv.quantity + delta < 0:
        raise HTTPException(409, f"Insufficient stock (available {inv.quantity})")
    inv.quantity += delta
    add_inventory_tx(db, org_id, variant_id, kind, delta, user_id, reason, ref_type, ref_id)
    return inv


def merch_discount_pct(db: Session, member: Optional[Member]) -> D:
    if not member:
        return D(0)
    m = msvc.active_membership(db, member.id)
    if not m:
        return D(0)
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == s(m.membership_plan_id)).first()
    return D(plan.merchandise_discount_percentage) if plan else D(0)


def place_order(db: Session, ctx, items, method: str, member: Optional[Member]) -> Order:
    pct = merch_discount_pct(db, member)
    order = Order(id=new_id(), organization_id=ctx.org_id, member_id=s(member.id) if member else None,
                  order_number=token_code("ORD", 8), subtotal=0, discount_amount=0, total_amount=0,
                  status="CONFIRMED", payment_status="PAID", payment_method=method)
    db.add(order)
    db.flush()
    subtotal, discount = D(0), D(0)
    for it in sorted(items, key=lambda i: i.variant_id):  # stable lock order
        v = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id, ProductVariant.is_active == True).first()  # noqa: E712
        p = db.query(Product).filter(Product.id == s(v.product_id)).first() if v else None
        if not v or not p or s(p.organization_id) != ctx.org_id or not p.is_active:
            raise HTTPException(404, "Product variant not available")
        unit = q(v.price)
        line_gross = unit * it.quantity
        line_disc = q(line_gross * pct / 100)
        change_stock(db, ctx.org_id, v.id, -it.quantity, "SALE", ctx.user.id, f"Order {order.order_number}", "ORDER", order.id)
        db.add(OrderItem(id=new_id(), order_id=s(order.id), product_variant_id=s(v.id),
                         product_name_snapshot=p.name,
                         variant_snapshot=" / ".join(x for x in [v.size, v.color, v.sku] if x),
                         quantity=it.quantity, unit_price=unit, discount_amount=line_disc,
                         total_price=line_gross - line_disc))
        subtotal += line_gross
        discount += line_disc
    order.subtotal, order.discount_amount, order.total_amount = q(subtotal), q(discount), q(subtotal - discount)
    db.add(OrderPayment(id=new_id(), order_id=s(order.id), amount=order.total_amount, payment_method=method,
                        payment_reference=token_code("PAY", 10), status="PAID", paid_at=now()))
    if order.total_amount > 0:
        ledger.record(db, ctx.org_id, ledger.INCOME, "MERCHANDISE", order.total_amount, ctx.user.id,
                      f"Order {order.order_number}", "ORDER", order.id)
    db.flush()
    return order


FLOW = {"CONFIRMED": ["READY", "CANCELLED", "REFUNDED"], "READY": ["COMPLETED", "CANCELLED", "REFUNDED"],
        "COMPLETED": ["REFUNDED"], "CANCELLED": [], "REFUNDED": []}


def set_status(db: Session, ctx, order: Order, new: str) -> Order:
    new = new.upper()
    if new not in FLOW.get(order.status, []):
        raise HTTPException(409, f"Cannot move order from {order.status} to {new}")
    if new in ("CANCELLED", "REFUNDED"):
        # restore stock exactly once (guard against double restore via inventory transactions)
        for it in db.query(OrderItem).filter(OrderItem.order_id == s(order.id)).all():
            change_stock(db, ctx.org_id, it.product_variant_id, it.quantity, "RETURN", ctx.user.id,
                         f"{new} {order.order_number}", "ORDER", order.id)
        ledger.reverse_by_reference(db, ctx.org_id, "ORDER", order.id, ctx.user.id, f"{new} {order.order_number}")
        order.payment_status = "REFUNDED"
    order.status = new
    return order
