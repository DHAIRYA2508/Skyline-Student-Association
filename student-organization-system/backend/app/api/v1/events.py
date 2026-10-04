from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.event import Event, EventTicket
from app.schemas.requests import EventIn, EventUpdate
from app.services import audit, events as esvc, membership as msvc
from app.utils.common import iso, money, naive, new_id, s

router = APIRouter(prefix="/events", tags=["Events"])


def event_out(db: Session, e: Event, ctx: Ctx, with_stats: bool = False) -> dict:
    taken = esvc.seats_taken(db, e.id)
    member = ctx.member
    price, ttype = esvc.price_for(db, e, member)
    st = esvc.stats(db, e)
    out = {"id": s(e.id), "name": e.name, "description": e.description, "venue": e.venue,
           "start_datetime": iso(e.start_datetime), "end_datetime": iso(e.end_datetime), "capacity": e.capacity,
           "seats_taken": taken, "seats_left": max(e.capacity - taken, 0), "member_price": money(e.member_price),
           "non_member_price": money(e.non_member_price), "your_price": float(price), "your_price_type": ttype,
           "status": e.status, "sold": st["sold"], "revenue": float(st["revenue"]), "checked_in": st["checked_in"]}
    if with_stats:
        out["stats"] = st
    return out


@router.get("")
def list_events(scope: str = "upcoming", ctx: Ctx = Depends(current_ctx)):
    from app.utils.common import now
    q = ctx.db.query(Event).filter(Event.organization_id == ctx.org_id, Event.is_deleted == False)  # noqa: E712
    staff = ctx.can("events.manage") or ctx.can("checkin.perform") or ctx.can("tickets.manage")
    if not staff:
        q = q.filter(Event.status == "PUBLISHED")
    if scope == "upcoming":
        q = q.filter(Event.end_datetime >= now())
    elif scope == "past":
        q = q.filter(Event.end_datetime < now())
    rows = q.order_by(Event.start_datetime.asc() if scope != "past" else Event.start_datetime.desc()).all()
    return [event_out(ctx.db, e, ctx, with_stats=staff) for e in rows]


@router.post("", status_code=201)
def create_event(body: EventIn, ctx: Ctx = Depends(require("events.manage"))):
    e = Event(id=new_id(), organization_id=ctx.org_id, created_by=s(ctx.user.id), status="DRAFT", currency="INR",
              **{**body.model_dump(), "start_datetime": naive(body.start_datetime), "end_datetime": naive(body.end_datetime)})
    ctx.db.add(e)
    audit.log(ctx.db, ctx, "EVENT_CREATED", "Event", e.id, new=body.model_dump())
    ctx.db.commit()
    return event_out(ctx.db, e, ctx, True)


@router.get("/{event_id}")
def get_event(event_id: str, ctx: Ctx = Depends(current_ctx)):
    e = get_or_404(ctx.db, Event, event_id, ctx.org_id)
    staff = ctx.can("events.manage") or ctx.can("checkin.perform")
    if e.status != "PUBLISHED" and not staff:
        raise HTTPException(404, "Event not found")
    return event_out(ctx.db, e, ctx, staff)


@router.patch("/{event_id}")
def update_event(event_id: str, body: EventUpdate, ctx: Ctx = Depends(require("events.manage"))):
    e = get_or_404(ctx.db, Event, event_id, ctx.org_id)
    old = event_out(ctx.db, e, ctx)
    data = body.model_dump(exclude_none=True)
    if "capacity" in data and data["capacity"] < esvc.seats_taken(ctx.db, e.id):
        raise HTTPException(409, "Capacity cannot be lower than tickets already sold")
    for k, v in data.items():
        setattr(e, k, naive(v) if k.endswith("datetime") else v)
    audit.log(ctx.db, ctx, "EVENT_UPDATED", "Event", e.id, old=old, new=data)
    ctx.db.commit()
    return event_out(ctx.db, e, ctx, True)


@router.post("/{event_id}/{action}")
def event_action(event_id: str, action: str, ctx: Ctx = Depends(require("events.manage"))):
    e = get_or_404(ctx.db, Event, event_id, ctx.org_id)
    target = {"publish": "PUBLISHED", "unpublish": "DRAFT", "cancel": "CANCELLED", "complete": "COMPLETED"}.get(action)
    if not target:
        raise HTTPException(404, "Unknown action")
    old = e.status
    e.status = target
    audit.log(ctx.db, ctx, f"EVENT_{action.upper()}", "Event", e.id, old={"status": old}, new={"status": target})
    ctx.db.commit()
    return event_out(ctx.db, e, ctx, True)


@router.get("/{event_id}/attendees")
def attendees(event_id: str, ctx: Ctx = Depends(require("checkin.perform", "tickets.manage", "events.manage"))):
    e = get_or_404(ctx.db, Event, event_id, ctx.org_id)
    rows = ctx.db.query(EventTicket).filter(EventTicket.event_id == s(e.id)).order_by(EventTicket.purchased_at.desc()).all()
    from app.api.v1.tickets import ticket_out
    return {"event": event_out(ctx.db, e, ctx, True), "tickets": [ticket_out(ctx.db, t) for t in rows]}
