from datetime import date, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.communication import Notification
from app.models.member import Member, Membership, MembershipBenefit, MembershipPayment, MembershipPlan
from app.services import ledger
from app.utils.common import add_months, money, new_id, now, q, s, today, token_code

RENEWAL_WINDOW_DAYS = 30


def _is_current(m: Membership, ref: date) -> bool:
    return m.status == "ACTIVE" and m.payment_status == "PAID" and m.start_date <= ref <= m.end_date


def active_membership(db: Session, member_id, ref: Optional[date] = None) -> Optional[Membership]:
    ref = ref or today()
    rows = db.query(Membership).filter(Membership.member_id == s(member_id)).all()
    cur = [m for m in rows if _is_current(m, ref)]
    return max(cur, key=lambda m: m.end_date) if cur else None


def is_active_member(db: Session, member_id) -> bool:
    return bool(member_id) and active_membership(db, member_id) is not None


def summary(db: Session, member: Member) -> dict:
    """Everything the UI needs to show membership state, benefits and expiry."""
    ref = today()
    rows = db.query(Membership).filter(Membership.member_id == s(member.id)).order_by(Membership.created_at.desc()).all()
    paid = [m for m in rows if m.payment_status == "PAID"]
    cur = active_membership(db, member.id, ref)
    latest = max(paid, key=lambda m: m.end_date) if paid else (rows[0] if rows else None)
    if latest is None:
        return {"state": "NONE", "is_active": False, "needs_renewal": False, "member_status": member.status}
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == s(latest.membership_plan_id)).first()
    end = max(m.end_date for m in paid) if paid else latest.end_date
    days = (end - ref).days
    state = "ACTIVE" if cur else ("EXPIRED" if paid and days < 0 else "PENDING")
    benefits = []
    if plan:
        benefits = [b.description or b.benefit_type for b in
                    db.query(MembershipBenefit).filter(MembershipBenefit.membership_plan_id == s(plan.id)).all()]
    return {
        "state": state, "is_active": bool(cur), "membership_id": s(latest.id),
        "plan_id": s(plan.id) if plan else None, "plan_name": plan.name if plan else "Membership",
        "start_date": latest.start_date.isoformat(), "end_date": end.isoformat(),
        "days_until_expiry": days, "payment_status": latest.payment_status,
        "needs_renewal": state != "ACTIVE" or days <= RENEWAL_WINDOW_DAYS,
        "event_discount_percentage": float(plan.event_discount_percentage) if plan and cur else 0,
        "merchandise_discount_percentage": float(plan.merchandise_discount_percentage) if plan and cur else 0,
        "benefits": benefits, "member_status": member.status,
    }


def purchase(db: Session, org_id, user, member: Member, plan: MembershipPlan, method: str,
             actor_id=None) -> Membership:
    """Pay dues (simulated gateway) -> active membership (new or renewal) + ledger income."""
    if not plan.is_active or s(plan.organization_id) != s(org_id):
        raise HTTPException(404, "Membership plan not found")
    ref = today()
    cur = active_membership(db, member.id, ref)
    start = cur.end_date + timedelta(days=1) if cur else ref
    prev = cur or (db.query(Membership).filter(Membership.member_id == s(member.id))
                   .order_by(Membership.end_date.desc()).first())
    m = Membership(id=new_id(), organization_id=s(org_id), member_id=s(member.id), membership_plan_id=s(plan.id),
                   start_date=start, end_date=add_months(start, plan.duration_months) - timedelta(days=1),
                   status="ACTIVE", amount=q(plan.price), currency=plan.currency, payment_status="PAID",
                   renewed_from_id=s(prev.id) if prev else None)
    db.add(m)
    db.flush()
    pay = MembershipPayment(id=new_id(), membership_id=s(m.id), amount=q(plan.price), currency=plan.currency,
                            payment_method=method, payment_reference=token_code("PAY", 10),
                            status="PAID", paid_at=now())
    db.add(pay)
    if prev and prev.status == "EXPIRED":
        prev.status = "RENEWED"
    member.status = "ACTIVE"
    if q(plan.price) > 0:
        ledger.record(db, org_id, ledger.INCOME, "MEMBERSHIP_DUES", plan.price, actor_id or user.id,
                      f"{plan.name} - {member.first_name} {member.last_name}", "MEMBERSHIP", m.id, currency=plan.currency)
    return m


def sweep(db: Session, org_id) -> dict:
    """Mark lapsed memberships EXPIRED and raise one-off renewal reminders."""
    ref = today()
    expired = 0
    for m in db.query(Membership).filter(Membership.organization_id == s(org_id), Membership.status == "ACTIVE",
                                         Membership.end_date < ref).all():
        m.status = "EXPIRED"
        expired += 1
    reminders = 0
    soon = ref + timedelta(days=RENEWAL_WINDOW_DAYS)
    for m in db.query(Membership).filter(Membership.organization_id == s(org_id), Membership.status == "ACTIVE",
                                         Membership.end_date >= ref, Membership.end_date <= soon).all():
        member = db.query(Member).filter(Member.id == s(m.member_id)).first()
        if not member or not member.user_id:
            continue
        exists = db.query(Notification).filter(Notification.type == "MEMBERSHIP_EXPIRING",
                                               Notification.reference_id == s(m.id)).first()
        if not exists:
            db.add(Notification(id=new_id(), organization_id=s(org_id), user_id=s(member.user_id),
                                type="MEMBERSHIP_EXPIRING", title="Your membership is expiring soon",
                                message=f"Your membership ends on {m.end_date.isoformat()}. Renew to keep your member perks.",
                                reference_type="MEMBERSHIP", reference_id=s(m.id)))
            reminders += 1
    db.flush()
    return {"expired": expired, "reminders": reminders}
