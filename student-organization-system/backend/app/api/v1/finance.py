from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import Ctx, get_or_404, require
from app.models.finance import Transaction
from app.schemas.requests import ReverseIn, TransactionIn
from app.services import audit, ledger
from app.utils.common import iso, money, naive, s

router = APIRouter(prefix="/finance", tags=["Finance"])


def tx_out(db, t: Transaction) -> dict:
    reversed_ = db.query(Transaction.id).filter(Transaction.reversal_of_id == s(t.id)).first() is not None
    return {"id": s(t.id), "type": t.transaction_type, "category": t.category, "amount": money(t.amount),
            "description": t.description, "date": iso(t.transaction_date), "reference_type": t.reference_type,
            "reference_id": s(t.reference_id), "is_reversal": t.reversal_of_id is not None,
            "reversal_of_id": s(t.reversal_of_id), "reversed": reversed_}


@router.get("/summary")
def summary(since: Optional[datetime] = None, until: Optional[datetime] = None, ctx: Ctx = Depends(require("finance.view"))):
    out = ledger.summary(ctx.db, ctx.org_id, naive(since), naive(until))
    # monthly cash-flow for the chart
    from collections import defaultdict
    months = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for t in ctx.db.query(Transaction).filter(Transaction.organization_id == ctx.org_id).all():
        key = t.transaction_date.strftime("%Y-%m")
        sign_income = (t.transaction_type == "INCOME") != (t.reversal_of_id is not None)
        months[key]["income" if sign_income else "expenses"] += money(t.amount) * (1 if t.reversal_of_id is None else -1)
    out["monthly"] = [{"month": k, **{a: round(b, 2) for a, b in v.items()}} for k, v in sorted(months.items())]
    return out


@router.get("/transactions")
def list_tx(type: str = "", category: str = "", page: int = Query(1, ge=1), page_size: int = Query(30, le=200),
            ctx: Ctx = Depends(require("finance.view"))):
    q = ctx.db.query(Transaction).filter(Transaction.organization_id == ctx.org_id)
    if type:
        q = q.filter(Transaction.transaction_type == type.upper())
    if category:
        q = q.filter(Transaction.category == category.upper())
    total = q.count()
    rows = q.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [tx_out(ctx.db, t) for t in rows]}


@router.post("/transactions", status_code=201)
def create_tx(body: TransactionIn, ctx: Ctx = Depends(require("finance.manage"))):
    kind = body.transaction_type.upper()
    cats = ledger.CATEGORIES_IN if kind == ledger.INCOME else ledger.CATEGORIES_OUT
    if body.category.upper() not in cats:
        raise HTTPException(400, f"category must be one of {cats}")
    t = ledger.record(ctx.db, ctx.org_id, kind, body.category.upper(), body.amount, ctx.user.id, body.description or "",
                      "MANUAL", None, when=naive(body.transaction_date))
    audit.log(ctx.db, ctx, "TRANSACTION_CREATED", "Transaction", t.id, new={"type": kind, "category": t.category, "amount": money(t.amount)})
    ctx.db.commit()
    return tx_out(ctx.db, t)


@router.post("/transactions/{tx_id}/reverse", status_code=201)
def reverse_tx(tx_id: str, body: ReverseIn, ctx: Ctx = Depends(require("finance.manage"))):
    """History is never edited or deleted - corrections post an offsetting reversal."""
    t = get_or_404(ctx.db, Transaction, tx_id, ctx.org_id)
    r = ledger.reverse(ctx.db, t, ctx.user.id, body.reason)
    audit.log(ctx.db, ctx, "TRANSACTION_REVERSED", "Transaction", t.id, new={"reversal": s(r.id), "reason": body.reason})
    ctx.db.commit()
    return tx_out(ctx.db, r)
