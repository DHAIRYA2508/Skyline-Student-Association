from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.member import Member, Membership, MembershipBenefit, MembershipPlan
from app.schemas.requests import JoinIn, PlanIn
from app.services import audit, membership as msvc
from app.utils.common import money, new_id, s

router = APIRouter(prefix="/memberships", tags=["Memberships"])


def plan_out(db: Session, p: MembershipPlan) -> dict:
    benefits = [b.description or b.benefit_type for b in
                db.query(MembershipBenefit).filter(MembershipBenefit.membership_plan_id == s(p.id)).all()]
    return {"id": s(p.id), "name": p.name, "description": p.description, "price": money(p.price), "currency": p.currency,
            "duration_months": p.duration_months, "event_discount_percentage": float(p.event_discount_percentage),
            "merchandise_discount_percentage": float(p.merchandise_discount_percentage), "benefits": benefits,
            "is_active": p.is_active}


@router.get("/plans")
def plans(ctx: Ctx = Depends(current_ctx)):
    rows = ctx.db.query(MembershipPlan).filter(MembershipPlan.organization_id == ctx.org_id).order_by(MembershipPlan.price).all()
    if not ctx.can("memberships.manage"):
        rows = [r for r in rows if r.is_active]
    return [plan_out(ctx.db, p) for p in rows]


def _save_benefits(db, plan, benefits):
    for b in db.query(MembershipBenefit).filter(MembershipBenefit.membership_plan_id == s(plan.id)).all():
        db.delete(b)
    for text in benefits:
        db.add(MembershipBenefit(id=new_id(), membership_plan_id=s(plan.id), benefit_type="PERK", description=text))


@router.post("/plans", status_code=201)
def create_plan(body: PlanIn, ctx: Ctx = Depends(require("memberships.manage"))):
    p = MembershipPlan(id=new_id(), organization_id=ctx.org_id, **body.model_dump(exclude={"benefits"}))
    ctx.db.add(p)
    ctx.db.flush()
    _save_benefits(ctx.db, p, body.benefits)
    audit.log(ctx.db, ctx, "PLAN_CREATED", "MembershipPlan", p.id, new=body.model_dump())
    ctx.db.commit()
    return plan_out(ctx.db, p)


@router.put("/plans/{plan_id}")
def update_plan(plan_id: str, body: PlanIn, ctx: Ctx = Depends(require("memberships.manage"))):
    p = get_or_404(ctx.db, MembershipPlan, plan_id, ctx.org_id)
    old = plan_out(ctx.db, p)
    for k, v in body.model_dump(exclude={"benefits"}).items():
        setattr(p, k, v)
    _save_benefits(ctx.db, p, body.benefits)
    audit.log(ctx.db, ctx, "PLAN_UPDATED", "MembershipPlan", p.id, old=old, new=body.model_dump())
    ctx.db.commit()
    return plan_out(ctx.db, p)


@router.get("/me")
def my_membership(ctx: Ctx = Depends(current_ctx)):
    m = ctx.member
    if not m:
        raise HTTPException(404, "No member profile")
    rows = ctx.db.query(Membership).filter(Membership.member_id == s(m.id)).order_by(Membership.created_at.desc()).all()
    history = []
    for r in rows:
        plan = ctx.db.query(MembershipPlan).filter(MembershipPlan.id == s(r.membership_plan_id)).first()
        history.append({"id": s(r.id), "plan_name": plan.name if plan else "", "start_date": r.start_date.isoformat(),
                        "end_date": r.end_date.isoformat(), "status": r.status, "payment_status": r.payment_status,
                        "amount": money(r.amount)})
    return {"summary": msvc.summary(ctx.db, m), "history": history}


@router.post("/join", status_code=201)
def join_or_renew(body: JoinIn, ctx: Ctx = Depends(current_ctx)):
    """Select plan -> pay dues (simulated gateway) -> active membership. Also used for renewals."""
    member = ctx.member
    if not member:
        raise HTTPException(404, "No member profile")
    if body.phone:
        member.phone = body.phone
    plan = get_or_404(ctx.db, MembershipPlan, body.plan_id, ctx.org_id)
    renewal = msvc.active_membership(ctx.db, member.id) is not None
    m = msvc.purchase(ctx.db, ctx.org_id, ctx.user, member, plan, body.payment_method)
    audit.log(ctx.db, ctx, "MEMBERSHIP_RENEWED" if renewal else "MEMBERSHIP_PURCHASED", "Membership", m.id,
              new={"plan": plan.name, "amount": money(plan.price)})
    ctx.db.commit()
    return {"ok": True, "membership": msvc.summary(ctx.db, member)}


@router.post("/{member_id}/grant")
def staff_grant(member_id: str, body: JoinIn, ctx: Ctx = Depends(require("memberships.manage"))):
    """Table sign-up: staff takes dues in person for a member."""
    member = get_or_404(ctx.db, Member, member_id, ctx.org_id)
    plan = get_or_404(ctx.db, MembershipPlan, body.plan_id, ctx.org_id)
    m = msvc.purchase(ctx.db, ctx.org_id, ctx.user, member, plan, body.payment_method)
    audit.log(ctx.db, ctx, "MEMBERSHIP_GRANTED", "Membership", m.id, new={"member": s(member.id), "plan": plan.name})
    ctx.db.commit()
    return {"ok": True, "membership": msvc.summary(ctx.db, member)}


@router.get("/expiring")
def expiring(ctx: Ctx = Depends(require("members.view", "memberships.manage"))):
    from datetime import timedelta
    from app.utils.common import today
    msvc.sweep(ctx.db, ctx.org_id)
    ctx.db.commit()
    soon = today() + timedelta(days=30)
    out = []
    for m in ctx.db.query(Membership).filter(Membership.organization_id == ctx.org_id, Membership.status == "ACTIVE",
                                             Membership.end_date <= soon).order_by(Membership.end_date).all():
        mem = ctx.db.query(Member).filter(Member.id == s(m.member_id)).first()
        out.append({"member_id": s(m.member_id), "name": f"{mem.first_name} {mem.last_name}", "email": mem.email,
                    "end_date": m.end_date.isoformat(), "days_left": (m.end_date - today()).days})
    return out
