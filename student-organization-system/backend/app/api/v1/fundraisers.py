from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.volunteer import Fundraiser, Task
from app.schemas.requests import DonationIn, FundraiserIn, FundraiserUpdate
from app.services import audit, ledger
from app.utils.common import iso, money, new_id, s

router = APIRouter(prefix="/fundraisers", tags=["Fundraisers"])


def out(db, f: Fundraiser) -> dict:
    # amount_raised is DERIVED from ledger transactions, then cached on the row for convenience
    raised = ledger.income_for_reference(db, f.organization_id, "FUNDRAISER", f.id)
    tasks = db.query(Task).filter(Task.fundraiser_id == s(f.id)).all()
    done = len([t for t in tasks if t.status == "DONE"])
    target = money(f.target_amount)
    return {"id": s(f.id), "name": f.name, "description": f.description, "target_amount": target,
            "amount_raised": raised, "percent": round(min(100, 100 * raised / target), 1) if target else 0,
            "start_date": iso(f.start_date), "end_date": iso(f.end_date), "status": f.status,
            "tasks_total": len(tasks), "tasks_done": done,
            "tasks_in_progress": len([t for t in tasks if t.status == "IN_PROGRESS"]),
            "tasks_todo": len([t for t in tasks if t.status == "TODO"])}


@router.get("")
def list_fundraisers(ctx: Ctx = Depends(current_ctx)):
    rows = ctx.db.query(Fundraiser).filter(Fundraiser.organization_id == ctx.org_id).order_by(Fundraiser.start_date.desc()).all()
    return [out(ctx.db, f) for f in rows]


@router.post("", status_code=201)
def create(body: FundraiserIn, ctx: Ctx = Depends(require("fundraisers.manage"))):
    f = Fundraiser(id=new_id(), organization_id=ctx.org_id, created_by=s(ctx.user.id), **body.model_dump())
    ctx.db.add(f)
    audit.log(ctx.db, ctx, "FUNDRAISER_CREATED", "Fundraiser", f.id, new=body.model_dump())
    ctx.db.commit()
    return out(ctx.db, f)


@router.patch("/{fid}")
def update(fid: str, body: FundraiserUpdate, ctx: Ctx = Depends(require("fundraisers.manage"))):
    f = get_or_404(ctx.db, Fundraiser, fid, ctx.org_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(f, k, v)
    audit.log(ctx.db, ctx, "FUNDRAISER_UPDATED", "Fundraiser", f.id, new=body.model_dump(exclude_none=True))
    ctx.db.commit()
    return out(ctx.db, f)


@router.post("/{fid}/donations", status_code=201)
def record_income(fid: str, body: DonationIn, ctx: Ctx = Depends(require("fundraisers.manage", "finance.manage"))):
    """Record money raised (e.g. bake-sale takings). Goes through the ledger."""
    f = get_or_404(ctx.db, Fundraiser, fid, ctx.org_id)
    if f.status not in ("ACTIVE", "PLANNED"):
        raise HTTPException(409, "Fundraiser is not accepting income")
    tx = ledger.record(ctx.db, ctx.org_id, ledger.INCOME, "FUNDRAISER", body.amount, ctx.user.id,
                       body.description or f"Fundraiser: {f.name}", "FUNDRAISER", f.id)
    f.amount_raised = ledger.income_for_reference(ctx.db, ctx.org_id, "FUNDRAISER", f.id)
    audit.log(ctx.db, ctx, "FUNDRAISER_INCOME", "Fundraiser", f.id, new={"amount": money(body.amount), "tx": s(tx.id)})
    ctx.db.commit()
    return out(ctx.db, f)
