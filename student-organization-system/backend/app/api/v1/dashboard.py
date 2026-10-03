from datetime import timedelta

from fastapi import APIRouter, Depends

from app.api.deps import Ctx, current_ctx
from app.models.communication import Announcement, Notification
from app.models.event import Event, EventCheckin, EventTicket
from app.models.finance import Expense, Reimbursement
from app.models.member import Member, Membership
from app.models.merchandise import Inventory, Product
from app.models.order import Order
from app.models.volunteer import Fundraiser, Task, TaskAssignment, VolunteerProfile
from app.services import events as esvc, ledger
from app.services import membership as msvc
from app.utils.common import money, now, s, today

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


def _overview(ctx: Ctx):
    db, org = ctx.db, ctx.org_id
    members = db.query(Member).filter(Member.organization_id == org, Member.is_deleted == False).count()  # noqa: E712
    active = len({m.member_id for m in db.query(Membership).filter(
        Membership.organization_id == org, Membership.status == "ACTIVE", Membership.payment_status == "PAID",
        Membership.start_date <= today(), Membership.end_date >= today()).all()})
    tickets = db.query(EventTicket).filter(EventTicket.organization_id == org, EventTicket.status.in_(esvc.LIVE)).all()
    low = [i for i in db.query(Inventory).filter(Inventory.organization_id == org).all() if i.quantity <= i.low_stock_threshold]
    return {
        "members": members, "active_memberships": active,
        "events": db.query(Event).filter(Event.organization_id == org, Event.status == "PUBLISHED", Event.end_datetime >= now()).count(),
        "tickets_sold": len(tickets), "attendance": len([t for t in tickets if t.status == "CHECKED_IN"]),
        "products": db.query(Product).filter(Product.organization_id == org, Product.is_active == True).count(),  # noqa: E712
        "low_stock": len(low), "orders": db.query(Order).filter(Order.organization_id == org).count(),
        "volunteers": db.query(VolunteerProfile).filter(VolunteerProfile.organization_id == org, VolunteerProfile.status == "ACTIVE").count(),
        "fundraisers": db.query(Fundraiser).filter(Fundraiser.organization_id == org, Fundraiser.status == "ACTIVE").count(),
        "pending_expenses": db.query(Expense).filter(Expense.organization_id == org, Expense.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count(),
    }


def _finance(ctx: Ctx):
    db, org = ctx.db, ctx.org_id
    out = ledger.summary(db, org)
    out["pending_expenses"] = [{"id": s(e.id), "description": e.description, "amount": money(e.amount), "status": e.status}
                               for e in db.query(Expense).filter(Expense.organization_id == org, Expense.status.in_(["SUBMITTED", "UNDER_REVIEW"])).limit(6).all()]
    out["awaiting_reimbursement"] = [{"id": s(e.id), "description": e.description, "amount": money(e.amount)}
                                     for e in db.query(Expense).filter(Expense.organization_id == org, Expense.status == "APPROVED").limit(6).all()]
    out["reimbursed_total"] = money(sum((r.amount for r in db.query(Reimbursement).filter(Reimbursement.organization_id == org).all()), 0))
    return out


def _events(ctx: Ctx):
    db = ctx.db
    rows = db.query(Event).filter(Event.organization_id == ctx.org_id, Event.is_deleted == False).order_by(Event.start_datetime).all()  # noqa: E712
    upcoming = [e for e in rows if e.end_datetime >= now()]
    items = []
    for e in rows[-8:] if len(rows) > 8 else rows:
        st = esvc.stats(db, e)
        items.append({"id": s(e.id), "name": e.name, "status": e.status, "start": e.start_datetime.isoformat(), **st})
    return {"upcoming": len(upcoming), "revenue": round(sum(i["revenue"] for i in items), 2),
            "checked_in": sum(i["checked_in"] for i in items), "registrations": sum(i["sold"] for i in items), "events": items}


def _inventory(ctx: Ctx):
    db, org = ctx.db, ctx.org_id
    from app.api.v1.inventory import _row
    inv = [_row(db, i) for i in db.query(Inventory).filter(Inventory.organization_id == org).all()]
    orders = db.query(Order).filter(Order.organization_id == org).order_by(Order.created_at.desc()).all()
    return {"products": db.query(Product).filter(Product.organization_id == org).count(), "units_in_stock": sum(i["quantity"] for i in inv),
            "low_stock_items": [i for i in inv if i["low_stock"]][:10], "open_orders": len([o for o in orders if o.status in ("CONFIRMED", "READY")]),
            "orders_total": len(orders)}


def _volunteers(ctx: Ctx):
    db, org = ctx.db, ctx.org_id
    tasks = db.query(Task).filter(Task.organization_id == org).all()
    unassigned = [t for t in tasks if t.status != "DONE" and not db.query(TaskAssignment).filter(TaskAssignment.task_id == s(t.id)).first()]
    from app.api.v1.fundraisers import out as f_out
    return {"volunteers": db.query(VolunteerProfile).filter(VolunteerProfile.organization_id == org, VolunteerProfile.status == "ACTIVE").count(),
            "tasks_total": len(tasks), "tasks_done": len([t for t in tasks if t.status == "DONE"]),
            "tasks_in_progress": len([t for t in tasks if t.status == "IN_PROGRESS"]), "pending_assignments": len(unassigned),
            "unassigned": [{"id": s(t.id), "title": t.title, "priority": t.priority} for t in unassigned[:6]],
            "fundraisers": [f_out(db, f) for f in db.query(Fundraiser).filter(Fundraiser.organization_id == org).all()]}


def _member(ctx: Ctx):
    db, m = ctx.db, ctx.member
    out = {"membership": msvc.summary(db, m) if m else None}
    tickets = []
    if m:
        tickets = db.query(EventTicket).filter((EventTicket.member_id == s(m.id)) | (EventTicket.buyer_email == ctx.user.email)).filter(
            EventTicket.status.in_(["CONFIRMED", "CHECKED_IN"])).all()
    out["tickets"] = len(tickets)
    out["unread_notifications"] = db.query(Notification).filter(Notification.user_id == s(ctx.user.id), Notification.is_read == False).count()  # noqa: E712
    out["orders"] = db.query(Order).filter(Order.member_id == s(m.id)).count() if m else 0
    me = db.query(VolunteerProfile).filter(VolunteerProfile.member_id == s(m.id)).first() if m else None
    out["my_open_tasks"] = (db.query(TaskAssignment).join(Task, Task.id == TaskAssignment.task_id)
                            .filter(TaskAssignment.volunteer_id == s(me.id), Task.status != "DONE").count() if me else 0)
    return out


@router.get("")
def dashboard(ctx: Ctx = Depends(current_ctx)):
    out = {"roles": ctx.roles, "member": _member(ctx)}
    staff_roles = {"SUPER_ADMIN", "ORGANIZATION_HEAD"}
    if staff_roles & set(ctx.roles):
        out["overview"] = _overview(ctx)
    if ctx.can("finance.view"):
        out["finance"] = _finance(ctx)
    if ctx.can("events.manage") or ctx.can("checkin.perform"):
        out["events"] = _events(ctx)
    if ctx.can("inventory.manage") or ctx.can("orders.manage"):
        out["inventory"] = _inventory(ctx)
    if ctx.can("volunteers.manage") or ctx.can("tasks.manage"):
        out["volunteers"] = _volunteers(ctx)
    return out
