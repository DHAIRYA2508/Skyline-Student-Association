"""Shared helpers: ids, money, serialisation, pagination."""
import calendar
import json
import secrets
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

TWO = Decimal("0.01")


def new_id() -> str:
    return str(uuid.uuid4())


def s(value: Any) -> Optional[str]:
    """Stringify a UUID-ish value (GUID columns may hold UUID, bytes or str)."""
    if value is None:
        return None
    if isinstance(value, bytes):
        return str(uuid.UUID(bytes=value))
    return str(value)


def D(value: Any) -> Decimal:
    return Decimal(str(value if value is not None else 0))


def q(value: Any) -> Decimal:
    return D(value).quantize(TWO, rounding=ROUND_HALF_UP)


def money(value: Any) -> float:
    return float(q(value))


def now() -> datetime:
    return datetime.utcnow()


def today() -> date:
    return date.today()


def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def iso(value: Any) -> Optional[str]:
    return value.isoformat() if value else None


def jsonable(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


def token_code(prefix: str, n: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return f"{prefix}-" + "".join(secrets.choice(alphabet) for _ in range(n))


def naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        from datetime import timezone
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


__all__ = ["new_id", "s", "D", "q", "money", "now", "today", "add_months", "iso",
           "jsonable", "token_code", "naive", "timedelta"]
