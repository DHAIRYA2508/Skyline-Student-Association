from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.finance import Expense, Reimbursement
from app.services import ledger
from app.utils.common import new_id, now, s

TRANSITIONS = {"SUBMITTED": ["UNDER_REVIEW", "APPROVED", "REJECTED"],
               "UNDER_REVIEW": ["APPROVED", "REJECTED"], "APPROVED": ["REIMBURSED"],
               "REJECTED": [], "REIMBURSED": []}


def review(db: Session, ctx, exp: Expense, action: str, reason=None) -> Expense:
    target = {"START_REVIEW": "UNDER_REVIEW", "APPROVE": "APPROVED", "REJECT": "REJECTED"}.get(action.upper())
    if not target:
        raise HTTPException(400, "Unknown review action")
    if target in ("APPROVED", "REJECTED") and s(exp.submitted_by) == s(ctx.user.id):
        raise HTTPException(403, "You cannot approve or reject your own expense")
    if target not in TRANSITIONS.get(exp.status, []):
        raise HTTPException(409, f"Expense is {exp.status}; cannot {action.lower()}")
    if target == "REJECTED" and not reason:
        raise HTTPException(400, "A rejection reason is required")
    exp.status = target
    exp.reviewed_by, exp.reviewed_at = s(ctx.user.id), now()
    if target == "REJECTED":
        exp.rejection_reason = reason
    return exp


def reimburse(db: Session, ctx, exp: Expense, method: str, reference) -> Reimbursement:
    db.query(Expense).filter(Expense.id == s(exp.id)).with_for_update().first()
    if exp.status == "REIMBURSED" or db.query(Reimbursement).filter(Reimbursement.expense_id == s(exp.id)).first():
        raise HTTPException(409, "This expense has already been reimbursed")
    if exp.status != "APPROVED":
        raise HTTPException(409, "Only approved expenses can be reimbursed")
    r = Reimbursement(id=new_id(), organization_id=ctx.org_id, expense_id=s(exp.id), paid_to=s(exp.submitted_by),
                      amount=exp.amount, payment_method=method, payment_reference=reference, status="PAID",
                      paid_at=now(), processed_by=s(ctx.user.id))
    db.add(r)
    exp.status = "REIMBURSED"
    db.flush()
    ledger.record(db, ctx.org_id, ledger.EXPENSE, "REIMBURSEMENT", exp.amount, ctx.user.id,
                  f"Reimbursement: {exp.description}", "EXPENSE", exp.id)
    return r
