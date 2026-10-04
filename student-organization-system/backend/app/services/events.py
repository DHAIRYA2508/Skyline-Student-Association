from datetime import timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.event import Event, EventCheckin, EventTicket
from app.models.member import Member
from app.services import ledger, membership as msvc
from app.utils.common import new_id, now, q, s, token_code
import secrets

LIVE = ("RESERVED", "CONFIRMED", "CHECKED_IN")


def seats_taken(db: Session, event_id) -> int:
    return db.query(func.count(EventTicket.id)).filter(
        EventTicket.event_id == s(event_id), EventTicket.status.in_(LIVE)).scalar() or 0


def price_for(db: Session, event: Event, member: Optional[Member]):
    """Member price applies only to a valid, active, paid membership."""
    if member is not None and msvc.is_active_member(db, member.id):
        return q(event.member_price), "MEMBER"
    return q(event.non_member_price), "NON_MEMBER"


def purchase(db: Session, ctx, event: Event, qty: int, member: Optional[Member], buyer_name: str,
             buyer_email: str, method: str, sold_by) -> list:
    if event.status != "PUBLISHED":
        raise HTTPException(400, "Tickets are not on sale for this event")
    n = now()
    if event.registration_end and n > event.registration_end or event.end_datetime < n:
        raise HTTPException(400, "Registration for this event has closed")
    # lock the event row (no-op on SQLite) so concurrent buyers cannot oversell
    db.query(Event).filter(Event.id == s(event.id)).with_for_update().first()
    remaining = event.capacity - seats_taken(db, event.id)
    if qty > remaining:
        raise HTTPException(409, f"Only {max(remaining, 0)} seat(s) left for this event")
    has_member_disc = member is not None and msvc.is_active_member(db, member.id)
    mem_price = q(event.member_price)
    reg_price = q(event.non_member_price)

    tickets = []
    for idx in range(qty):
        # First ticket gets member discount if eligible; extra tickets are regular fare
        if idx == 0 and has_member_disc:
            price = mem_price
            ttype = "MEMBER"
        else:
            price = reg_price
            ttype = "NON_MEMBER"

        t = EventTicket(
            id=new_id(), organization_id=s(event.organization_id), event_id=s(event.id),
            member_id=s(member.id) if (member and idx == 0) else None,
            buyer_name=buyer_name if idx == 0 else f"{buyer_name} (Guest {idx})",
            buyer_email=buyer_email,
            ticket_code=token_code("TKT"), qr_token=secrets.token_urlsafe(24), ticket_type=ttype,
            price=price, currency=event.currency, payment_status="PAID",
            status="CONFIRMED", purchased_at=now())
        db.add(t)
        db.flush()
        tickets.append(t)
        if price > 0:
            ledger.record(db, event.organization_id, ledger.INCOME, "EVENT_TICKETS", price, sold_by,
                          f"Ticket {t.ticket_code} ({ttype}) - {event.name}", "TICKET", t.id, currency=event.currency)
    return tickets


def find_ticket(db: Session, org_id, code: str) -> EventTicket:
    code = code.strip()
    t = db.query(EventTicket).filter(EventTicket.organization_id == s(org_id),
                                     (EventTicket.ticket_code == code.upper()) | (EventTicket.qr_token == code)).first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    return t


def check_in(db: Session, ctx, ticket: EventTicket, method: str) -> EventCheckin:
    if ticket.status in ("CANCELLED", "REFUNDED"):
        raise HTTPException(409, f"Ticket is {ticket.status.lower()} and cannot be used")
    if ticket.status == "CHECKED_IN" or db.query(EventCheckin).filter(EventCheckin.ticket_id == s(ticket.id)).first():
        raise HTTPException(409, "Ticket has already been checked in")
    if ticket.payment_status != "PAID":
        raise HTTPException(402, "Ticket is not paid")
    c = EventCheckin(id=new_id(), event_id=s(ticket.event_id), ticket_id=s(ticket.id),
                     checked_in_by=s(ctx.user.id), checked_in_at=now(), method=method.upper())
    db.add(c)
    ticket.status = "CHECKED_IN"
    db.flush()
    return c


def cancel(db: Session, ctx, ticket: EventTicket, refund: bool, reason: str = "") -> EventTicket:
    if ticket.status == "CHECKED_IN":
        raise HTTPException(409, "A checked-in ticket cannot be cancelled")
    if ticket.status in ("CANCELLED", "REFUNDED"):
        raise HTTPException(409, "Ticket is already cancelled")
    ticket.status = "REFUNDED" if refund and ticket.payment_status == "PAID" else "CANCELLED"
    if ticket.status == "REFUNDED":
        ticket.payment_status = "REFUNDED"
        ledger.reverse_by_reference(db, ticket.organization_id, "TICKET", ticket.id, ctx.user.id,
                                    reason or f"Refund {ticket.ticket_code}")
    return ticket


def stats(db: Session, event: Event) -> dict:
    tickets = db.query(EventTicket).filter(EventTicket.event_id == s(event.id)).all()
    live = [t for t in tickets if t.status in LIVE]
    checked = [t for t in tickets if t.status == "CHECKED_IN"]
    revenue = sum((q(t.price) for t in tickets if t.payment_status == "PAID" and t.status in LIVE), q(0))
    return {
        "sold": len(live), "capacity": event.capacity, "remaining": max(event.capacity - len(live), 0),
        "checked_in": len(checked), "no_shows": len(live) - len(checked),
        "attendance_rate": round(100 * len(checked) / len(live), 1) if live else 0.0,
        "revenue": float(revenue),
        "member_tickets": len([t for t in live if t.ticket_type == "MEMBER"]),
        "non_member_tickets": len([t for t in live if t.ticket_type != "MEMBER"]),
    }
