import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.models.auth import Member, Membership, MembershipPlan
from app.schemas.auth import MemberVerificationResponse

router = APIRouter(prefix="/members", tags=["Member Verification"])


def uuid_to_str(binary_uuid) -> str:
    if isinstance(binary_uuid, bytes):
        return str(uuid.UUID(bytes=binary_uuid))
    return str(binary_uuid)


@router.get("/verify", response_model=MemberVerificationResponse)
def verify_member(query: str = Query(..., min_length=2, description="Email or Student ID"), db: Session = Depends(get_db)):
    member = (
        db.query(Member)
        .filter(or_(Member.email.ilike(f"%{query.strip()}%"), Member.student_id.ilike(f"%{query.strip()}%")))
        .first()
    )

    if not member:
        return MemberVerificationResponse(
            found=False,
            student_id=query,
            first_name="",
            last_name="",
            email="",
            is_member=False,
            membership_status="NOT_FOUND",
            dues_paid=False,
            payment_status="UNPAID",
        )

    # Find active or latest membership
    membership = (
        db.query(Membership)
        .filter(Membership.member_id == member.id)
        .order_by(Membership.created_at.desc())
        .first()
    )

    if not membership:
        return MemberVerificationResponse(
            found=True,
            student_id=member.student_id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            phone=member.phone,
            is_member=False,
            membership_status="NO_MEMBERSHIP",
            dues_paid=False,
            payment_status="UNPAID",
        )

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == membership.membership_plan_id).first()

    today = date.today()
    days_until_expiry = (membership.end_date - today).days
    dues_paid = membership.payment_status.upper() == "PAID"
    is_active = (membership.status.upper() == "ACTIVE") and (days_until_expiry >= 0) and dues_paid
    needs_renewal = (days_until_expiry <= 30) or not is_active

    return MemberVerificationResponse(
        found=True,
        student_id=member.student_id,
        first_name=member.first_name,
        last_name=member.last_name,
        email=member.email,
        phone=member.phone,
        is_member=is_active,
        membership_status="ACTIVE" if is_active else ("EXPIRED" if days_until_expiry < 0 else "PENDING_DUES"),
        dues_paid=dues_paid,
        payment_status=membership.payment_status.upper(),
        plan_name=plan.name if plan else "Standard Plan",
        event_discount_percentage=float(plan.event_discount_percentage) if plan else 0.0,
        merchandise_discount_percentage=float(plan.merchandise_discount_percentage) if plan else 0.0,
        end_date=membership.end_date.isoformat(),
        days_until_expiry=days_until_expiry,
        needs_renewal_reminder=needs_renewal,
    )
