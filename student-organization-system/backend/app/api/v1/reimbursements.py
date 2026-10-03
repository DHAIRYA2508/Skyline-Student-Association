from fastapi import APIRouter, Depends

from app.api.deps import Ctx, require
from app.models.finance import Expense, Reimbursement
from app.models.organization import User
from app.utils.common import iso, money, s

router = APIRouter(prefix="/reimbursements", tags=["Reimbursements"])


@router.get("")
def list_reimbursements(ctx: Ctx = Depends(require("reimbursements.process", "finance.view"))):
    rows = ctx.db.query(Reimbursement).filter(Reimbursement.organization_id == ctx.org_id) \
        .order_by(Reimbursement.created_at.desc()).all()
    out = []
    for r in rows:
        u = ctx.db.query(User).filter(User.id == s(r.paid_to)).first()
        e = ctx.db.query(Expense).filter(Expense.id == s(r.expense_id)).first()
        out.append({"id": s(r.id), "expense_id": s(r.expense_id), "description": e.description if e else "",
                    "paid_to": f"{u.first_name} {u.last_name}" if u else "", "amount": money(r.amount),
                    "payment_method": r.payment_method, "payment_reference": r.payment_reference, "status": r.status,
                    "paid_at": iso(r.paid_at)})
    return out
