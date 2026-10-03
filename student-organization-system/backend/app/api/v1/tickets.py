from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.event import Event, EventCheckin, EventTicket
from app.models.member import Member
from app.schemas.requests import CheckInIn, TicketBuyIn
from app.services import audit, events as esvc
from app.utils.common import iso, money, s

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def ticket_out(db, t: EventTicket, include_qr: bool = True) -> dict:
    e = db.query(Event).filter(Event.id == s(t.event_id)).first()
    chk = db.query(EventCheckin).filter(EventCheckin.ticket_id == s(t.id)).first()
    return {"id": s(t.id), "event_id": s(t.event_id), "event_name": e.name if e else "", "venue": e.venue if e else None,
            "event_start": iso(e.start_datetime) if e else None, "buyer_name": t.buyer_name, "buyer_email": t.buyer_email,
            "ticket_code": t.ticket_code, "qr_token": t.qr_token if include_qr else None, "ticket_type": t.ticket_type,
            "price": money(t.price), "payment_status": t.payment_status, "status": t.status, "purchased_at": iso(t.purchased_at),
            "checked_in_at": iso(chk.checked_in_at) if chk else None}


@router.post("/purchase", status_code=201)
def purchase(body: TicketBuyIn, ctx: Ctx = Depends(current_ctx)):
    event = get_or_404(ctx.db, Event, body.event_id, ctx.org_id)
    staff_sale = bool(body.member_lookup or body.buyer_email) and ctx.can("tickets.manage")
    if staff_sale:
        member = None
        if body.member_lookup:
            member = ctx.db.query(Member).filter(Member.organization_id == ctx.org_id,
                                                 or_(Member.student_id == body.member_lookup,
                                                     Member.email == body.member_lookup.lower())).first()
            if not member:
                raise HTTPException(404, "No member matches that student ID / email")
        name = body.buyer_name or (f"{member.first_name} {member.last_name}" if member else "Guest")
        email = body.buyer_email or (member.email if member else "guest@door.local")
    else:
        member = ctx.member
        name = body.buyer_name or f"{ctx.user.first_name} {ctx.user.last_name}"
        email = body.buyer_email or ctx.user.email
    tickets = esvc.purchase(ctx.db, ctx, event, body.quantity, member, name, email, body.payment_method, ctx.user.id)
    audit.log(ctx.db, ctx, "TICKETS_PURCHASED", "Event", event.id,
              new={"qty": body.quantity, "type": tickets[0].ticket_type, "method": body.payment_method})
    ctx.db.commit()
    return {"tickets": [ticket_out(ctx.db, t) for t in tickets]}


@router.get("/mine")
def my_tickets(ctx: Ctx = Depends(current_ctx)):
    m = ctx.member
    cond = [EventTicket.buyer_email == ctx.user.email]
    if m:
        cond.append(EventTicket.member_id == s(m.id))
    rows = ctx.db.query(EventTicket).filter(EventTicket.organization_id == ctx.org_id, or_(*cond)) \
        .order_by(EventTicket.purchased_at.desc()).all()
    return [ticket_out(ctx.db, t) for t in rows]


@router.post("/check-in")
def check_in(body: CheckInIn, ctx: Ctx = Depends(require("checkin.perform"))):
    t = esvc.find_ticket(ctx.db, ctx.org_id, body.code)
    esvc.check_in(ctx.db, ctx, t, body.method)
    audit.log(ctx.db, ctx, "TICKET_CHECKED_IN", "EventTicket", t.id, new={"method": body.method})
    ctx.db.commit()
    return ticket_out(ctx.db, t, include_qr=False)


@router.get("/lookup/{code}")
def lookup(code: str, ctx: Ctx = Depends(require("checkin.perform", "tickets.manage"))):
    return ticket_out(ctx.db, esvc.find_ticket(ctx.db, ctx.org_id, code), include_qr=False)


@router.post("/{ticket_id}/cancel")
def cancel(ticket_id: str, refund: bool = True, ctx: Ctx = Depends(require("tickets.manage"))):
    t = get_or_404(ctx.db, EventTicket, ticket_id, ctx.org_id)
    old = t.status
    esvc.cancel(ctx.db, ctx, t, refund)
    audit.log(ctx.db, ctx, "TICKET_REFUNDED" if t.status == "REFUNDED" else "TICKET_CANCELLED", "EventTicket", t.id,
              old={"status": old}, new={"status": t.status})
    ctx.db.commit()
    return ticket_out(ctx.db, t)
