from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.finance import Expense, ExpenseReceipt, Reimbursement
from app.models.organization import User
from app.schemas.requests import ExpenseIn, ExpenseReviewIn, ReceiptIn, ReimburseIn
from app.services import audit, expenses as xsvc
from app.utils.common import iso, money, new_id, s

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def out(db, e: Expense) -> dict:
    u = db.query(User).filter(User.id == s(e.submitted_by)).first()
    rec = db.query(ExpenseReceipt).filter(ExpenseReceipt.expense_id == s(e.id)).all()
    return {"id": s(e.id), "category": e.category, "description": e.description, "amount": money(e.amount),
            "expense_date": iso(e.expense_date), "status": e.status, "rejection_reason": e.rejection_reason,
            "submitted_by": s(e.submitted_by), "submitter": f"{u.first_name} {u.last_name}" if u else "",
            "reviewed_at": iso(e.reviewed_at), "created_at": iso(e.created_at),
            "receipts": [{"id": s(r.id), "file_name": r.file_name, "file_url": r.file_url, "mime_type": r.mime_type} for r in rec]}


@router.get("")
def list_expenses(status: str = "", ctx: Ctx = Depends(require("expenses.submit", "expenses.approve"))):
    q = ctx.db.query(Expense).filter(Expense.organization_id == ctx.org_id)
    if not ctx.can("expenses.approve"):
        q = q.filter(Expense.submitted_by == s(ctx.user.id))
    if status:
        q = q.filter(Expense.status == status.upper())
    return [out(ctx.db, e) for e in q.order_by(Expense.created_at.desc()).limit(300).all()]


@router.post("", status_code=201)
def submit(body: ExpenseIn, ctx: Ctx = Depends(require("expenses.submit"))):
    e = Expense(id=new_id(), organization_id=ctx.org_id, submitted_by=s(ctx.user.id), category=body.category,
                description=body.description, amount=body.amount, expense_date=body.expense_date, status="SUBMITTED")
    ctx.db.add(e)
    ctx.db.flush()
    for r in body.receipts:
        ctx.db.add(ExpenseReceipt(id=new_id(), expense_id=s(e.id), uploaded_by=s(ctx.user.id), **r.model_dump()))
    audit.log(ctx.db, ctx, "EXPENSE_SUBMITTED", "Expense", e.id, new={"amount": money(body.amount), "category": body.category})
    ctx.db.commit()
    return out(ctx.db, e)


@router.post("/{expense_id}/receipts", status_code=201)
def add_receipt(expense_id: str, body: ReceiptIn, ctx: Ctx = Depends(require("expenses.submit"))):
    e = get_or_404(ctx.db, Expense, expense_id, ctx.org_id)
    if s(e.submitted_by) != s(ctx.user.id) and not ctx.can("expenses.approve"):
        raise HTTPException(403, "Not your expense")
    ctx.db.add(ExpenseReceipt(id=new_id(), expense_id=s(e.id), uploaded_by=s(ctx.user.id), **body.model_dump()))
    ctx.db.commit()
    return out(ctx.db, e)


@router.post("/{expense_id}/review")
def review(expense_id: str, body: ExpenseReviewIn, ctx: Ctx = Depends(require("expenses.approve"))):
    e = get_or_404(ctx.db, Expense, expense_id, ctx.org_id)
    old = e.status
    xsvc.review(ctx.db, ctx, e, body.action, body.reason)
    audit.log(ctx.db, ctx, f"EXPENSE_{e.status}", "Expense", e.id, old={"status": old}, new={"status": e.status, "reason": body.reason})
    ctx.db.commit()
    return out(ctx.db, e)


@router.post("/{expense_id}/reimburse")
def reimburse(expense_id: str, body: ReimburseIn, ctx: Ctx = Depends(require("reimbursements.process"))):
    e = get_or_404(ctx.db, Expense, expense_id, ctx.org_id)
    r = xsvc.reimburse(ctx.db, ctx, e, body.payment_method, body.payment_reference)
    audit.log(ctx.db, ctx, "EXPENSE_REIMBURSED", "Expense", e.id, new={"amount": money(r.amount), "method": body.payment_method})
    ctx.db.commit()
    return out(ctx.db, e)
