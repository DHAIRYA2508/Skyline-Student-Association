"""Append-only financial ledger. Totals are always derived from transactions."""
from collections import defaultdict
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.finance import Transaction
from app.utils.common import D, new_id, q, money, s, now

INCOME, EXPENSE = "INCOME", "EXPENSE"

CATEGORIES_IN = ["MEMBERSHIP_DUES", "EVENT_TICKETS", "MERCHANDISE", "FUNDRAISER", "OTHER_INCOME"]
CATEGORIES_OUT = ["REIMBURSEMENT", "EVENT_EXPENSE", "SUPPLIES", "OTHER_EXPENSE"]


def record(db: Session, org_id, kind: str, category: str, amount, user_id, description: str = "",
           ref_type: Optional[str] = None, ref_id=None, reversal_of=None, when: Optional[datetime] = None,
           currency: str = "INR") -> Transaction:
    amount = q(amount)
    if amount <= 0:
        raise HTTPException(400, "Transaction amount must be positive")
    if kind not in (INCOME, EXPENSE):
        raise HTTPException(400, "Invalid transaction type")
    tx = Transaction(
        id=new_id(), organization_id=s(org_id), transaction_type=kind, category=category,
        amount=amount, currency=currency, description=description[:500],
        transaction_date=when or now(), reference_type=ref_type,
        reference_id=s(ref_id), reversal_of_id=s(reversal_of), created_by=s(user_id),
    )
    db.add(tx)
    db.flush()
    return tx


def reverse(db: Session, tx: Transaction, user_id, reason: str = "") -> Transaction:
    already = db.query(Transaction).filter(Transaction.reversal_of_id == s(tx.id)).first()
    if already:
        raise HTTPException(409, "Transaction has already been reversed")
    if tx.reversal_of_id:
        raise HTTPException(400, "A reversal cannot itself be reversed")
    kind = EXPENSE if tx.transaction_type == INCOME else INCOME
    return record(db, tx.organization_id, kind, tx.category, tx.amount, user_id,
                  f"Reversal: {reason or tx.description or ''}".strip(), tx.reference_type, tx.reference_id,
                  reversal_of=tx.id, currency=tx.currency)


def reverse_by_reference(db: Session, org_id, ref_type: str, ref_id, user_id, reason: str):
    rows = db.query(Transaction).filter(
        Transaction.organization_id == s(org_id), Transaction.reference_type == ref_type,
        Transaction.reference_id == s(ref_id), Transaction.reversal_of_id.is_(None)).all()
    for tx in rows:
        if not db.query(Transaction).filter(Transaction.reversal_of_id == s(tx.id)).first():
            reverse(db, tx, user_id, reason)


def summary(db: Session, org_id, since: Optional[datetime] = None, until: Optional[datetime] = None) -> dict:
    query = db.query(Transaction).filter(Transaction.organization_id == s(org_id))
    if since:
        query = query.filter(Transaction.transaction_date >= since)
    if until:
        query = query.filter(Transaction.transaction_date <= until)
    inc, exp = defaultdict(lambda: D(0)), defaultdict(lambda: D(0))
    for t in query.all():
        rev = t.reversal_of_id is not None
        if t.transaction_type == INCOME:
            if rev:
                exp[t.category] -= q(t.amount)
            else:
                inc[t.category] += q(t.amount)
        else:
            if rev:
                inc[t.category] -= q(t.amount)
            else:
                exp[t.category] += q(t.amount)
    total_in, total_out = sum(inc.values(), D(0)), sum(exp.values(), D(0))
    return {
        "total_income": money(total_in), "total_expenses": money(total_out),
        "balance": money(total_in - total_out),
        "income_by_category": {k: money(v) for k, v in inc.items() if v != 0 or k in CATEGORIES_IN},
        "expenses_by_category": {k: money(v) for k, v in exp.items() if v != 0 or k in CATEGORIES_OUT},
    }


def income_for_reference(db: Session, org_id, ref_type: str, ref_id=None, category: Optional[str] = None) -> float:
    query = db.query(Transaction).filter(Transaction.organization_id == s(org_id), Transaction.reference_type == ref_type)
    if ref_id:
        query = query.filter(Transaction.reference_id == s(ref_id))
    if category:
        query = query.filter(Transaction.category == category)
    total = D(0)
    for t in query.all():
        sign = 1 if t.transaction_type == INCOME else -1
        total += sign * q(t.amount)
    return money(total)
