"""RBAC bootstrap (always) + realistic demo data (first run only)."""
from datetime import date, datetime, timedelta
from types import SimpleNamespace

from sqlalchemy.orm import Session

from app.core.permissions import PERMISSIONS, ROLES
from app.core.security import get_password_hash
from app.models.communication import Announcement
from app.models.event import Event, EventTicket
from app.models.finance import Expense, ExpenseReceipt
from app.models.member import Member, Membership, MembershipBenefit, MembershipPayment, MembershipPlan
from app.models.merchandise import Product
from app.models.organization import Organization, Permission, Role, RolePermission, User, UserRole
from app.models.volunteer import Fundraiser, Task, TaskAssignment, VolunteerProfile
from app.schemas.requests import OrderItemIn
from app.services import events as esvc, expenses as xsvc, ledger, membership as msvc, orders as osvc
from app.utils.common import add_months, new_id, now, s, today


def ensure_rbac(db: Session, org: Organization) -> None:
    perms = {p.code: p for p in db.query(Permission).all()}
    for code, (module, desc) in PERMISSIONS.items():
        if code not in perms:
            perms[code] = Permission(id=new_id(), code=code, module=module, description=desc)
            db.add(perms[code])
    db.flush()
    for name, (desc, plist) in ROLES.items():
        role = db.query(Role).filter(Role.organization_id == s(org.id), Role.name == name).first()
        if not role:
            role = Role(id=new_id(), organization_id=s(org.id), name=name, description=desc, is_system_role=True)
            db.add(role)
            db.flush()
        have = {rp.permission_id for rp in db.query(RolePermission).filter(RolePermission.role_id == s(role.id)).all()}
        for code in plist:
            if s(perms[code].id) not in {s(h) for h in have}:
                db.add(RolePermission(role_id=s(role.id), permission_id=s(perms[code].id)))
    db.flush()


def _user(db, org, email, pw, first, last, sid, roles, join_plan=None, joined_days_ago=0):
    u = User(id=new_id(), organization_id=s(org.id), email=email, password_hash=get_password_hash(pw),
             first_name=first, last_name=last)
    db.add(u)
    db.flush()
    m = Member(id=new_id(), organization_id=s(org.id), user_id=s(u.id), student_id=sid, first_name=first, last_name=last,
               email=email, join_date=today() - timedelta(days=joined_days_ago), status="PENDING")
    db.add(m)
    for rn in set(roles) | {"MEMBER"}:
        role = db.query(Role).filter(Role.organization_id == s(org.id), Role.name == rn).first()
        db.add(UserRole(user_id=s(u.id), role_id=s(role.id)))
    db.flush()
    return u, m


def _backdated_membership(db, org, user, member, plan, start: date):
    """Historic dues (used for expired / expiring-soon demo members)."""
    end = add_months(start, plan.duration_months) - timedelta(days=1)
    m = Membership(id=new_id(), organization_id=s(org.id), member_id=s(member.id), membership_plan_id=s(plan.id),
                   start_date=start, end_date=end, status="ACTIVE", amount=plan.price, payment_status="PAID")
    db.add(m)
    db.flush()
    db.add(MembershipPayment(id=new_id(), membership_id=s(m.id), amount=plan.price, payment_method="CARD",
                             payment_reference=f"HIST-{s(m.id)[:8]}", status="PAID", paid_at=datetime.combine(start, datetime.min.time())))
    member.status = "ACTIVE"
    ledger.record(db, org.id, ledger.INCOME, "MEMBERSHIP_DUES", plan.price, user.id, f"{plan.name} - {member.first_name} {member.last_name}",
                  "MEMBERSHIP", m.id, when=datetime.combine(start, datetime.min.time()))
    return m


def seed_demo(db: Session, org: Organization) -> None:
    if db.query(User).filter(User.organization_id == s(org.id)).first():
        return
    # ---- plans -----------------------------------------------------------------
    basic = MembershipPlan(id=new_id(), organization_id=s(org.id), name="Student Basic", price=10, duration_months=6,
                           description="Six months of club membership.", event_discount_percentage=10, merchandise_discount_percentage=5)
    gold = MembershipPlan(id=new_id(), organization_id=s(org.id), name="Gold Annual", price=25, duration_months=12,
                          description="A full year with the best perks.", event_discount_percentage=20, merchandise_discount_percentage=15)
    db.add_all([basic, gold])
    db.flush()
    for plan, perks in ((basic, ["Member ticket pricing", "5% off merchandise", "Vote at the AGM"]),
                        (gold, ["Member ticket pricing", "15% off merchandise", "Priority seating at the Spring Gala", "Vote at the AGM"])):
        for text in perks:
            db.add(MembershipBenefit(id=new_id(), membership_plan_id=s(plan.id), benefit_type="PERK", description=text))
    # ---- people ----------------------------------------------------------------
    staff = {}
    for key, email, pw, first, last, sid, roles in [
        ("root", "contact@skyline-sa.org", "admin123", "Skyline", "Admin", "SKY-00001", ["SUPER_ADMIN"]),
        ("head", "admin@skyline-sa.org", "admin123", "Alex", "Rivera", "SKY-00002", ["ORGANIZATION_HEAD"]),
        ("treas", "treasurer@skyline-sa.org", "demo1234", "Tara", "Nguyen", "SKY-00003", ["TREASURER"]),
        ("events", "events@skyline-sa.org", "demo1234", "Eli", "Okafor", "SKY-00004", ["EVENT_MANAGER"]),
        ("inv", "inventory@skyline-sa.org", "demo1234", "Ines", "Moreau", "SKY-00005", ["INVENTORY_MANAGER"]),
        ("coord", "coordinator@skyline-sa.org", "demo1234", "Casey", "Brooks", "SKY-00006", ["VOLUNTEER_COORDINATOR"]),
        ("vol", "volunteer@skyline.edu", "demo1234", "Vik", "Shah", "SKY-10010", ["VOLUNTEER"]),
        ("john", "john.doe@skyline.edu", "password123", "John", "Doe", "SKY-89201", []),
        ("maya", "maya.chen@skyline.edu", "demo1234", "Maya", "Chen", "SKY-10011", []),
        ("omar", "omar.hassan@skyline.edu", "demo1234", "Omar", "Hassan", "SKY-10012", []),
        ("lena", "lena.fischer@skyline.edu", "demo1234", "Lena", "Fischer", "SKY-10013", ["VOLUNTEER"]),
        ("new", "new.student@skyline.edu", "demo1234", "Noor", "Patel", "SKY-10099", []),
    ]:
        staff[key] = _user(db, org, email, pw, first, last, sid, roles, joined_days_ago=40)
    U = lambda k: staff[k][0]  # noqa: E731
    M = lambda k: staff[k][1]  # noqa: E731
    root = U("root")
    for k in ("root", "head", "treas", "events", "inv", "coord", "vol", "john", "lena"):
        msvc.purchase(db, org.id, U(k), M(k), gold if k in ("root", "head", "john", "vol") else basic, "CARD")
    _backdated_membership(db, org, U("maya"), M("maya"), basic, today() - timedelta(days=160))   # expires in ~20 days
    _backdated_membership(db, org, U("omar"), M("omar"), basic, today() - timedelta(days=260))   # lapsed
    db.flush()
    sweep = msvc.sweep(db, org.id)  # noqa: F841
    ctx_root = SimpleNamespace(user=root, org_id=s(org.id), request=None)
    # ---- events ----------------------------------------------------------------
    def ev(name, desc, venue, start_days, hours, cap, mp, nmp, status="PUBLISHED"):
        st = now().replace(minute=0, second=0, microsecond=0) + timedelta(days=start_days)
        e = Event(id=new_id(), organization_id=s(org.id), name=name, description=desc, venue=venue, start_datetime=st,
                  end_datetime=st + timedelta(hours=hours), capacity=cap, member_price=mp, non_member_price=nmp, status=status,
                  created_by=s(U("events").id))
        db.add(e)
        db.flush()
        return e
    gala = ev("Spring Gala", "The biggest night of the semester: live music, food and a charity raffle.", "Skyline Grand Hall", 21, 5, 150, 20, 35)
    mic = ev("Open Mic Night", "Sing, rap, read or just cheer on your friends.", "Student Union Cafe", 6, 3, 60, 5, 8)
    ev("Hack Night", "Draft - pizza-powered coding session.", "Lab 204", 35, 6, 40, 0, 0, status="DRAFT")
    past = ev("Welcome Mixer", "Start-of-term meet and greet.", "Courtyard", 1, 3, 80, 4, 8)
    for k in ("john", "maya", "vol", "lena"):
        esvc.purchase(db, ctx_root, gala, 1, M(k), f"{M(k).first_name} {M(k).last_name}", M(k).email, "CARD", U(k).id)
    esvc.purchase(db, ctx_root, gala, 2, None, "Guest Visitors", "guests@example.com", "CASH", U("events").id)
    esvc.purchase(db, ctx_root, mic, 1, M("john"), "John Doe", M("john").email, "CARD", U("john").id)
    tickets = []
    for k in ("john", "maya", "omar", "vol", "lena", "head"):
        tickets += esvc.purchase(db, ctx_root, past, 1, M(k), f"{M(k).first_name} {M(k).last_name}", M(k).email, "CARD", U(k).id)
    tickets += esvc.purchase(db, ctx_root, past, 3, None, "Walk-in Guests", "walkin@example.com", "CASH", U("events").id)
    ctx_ev = SimpleNamespace(user=U("events"), org_id=s(org.id), request=None)
    for t in tickets[:7]:
        esvc.check_in(db, ctx_ev, t, "QR")
    past.start_datetime, past.end_datetime, past.status = now() - timedelta(days=5, hours=3), now() - timedelta(days=5), "COMPLETED"
    # ---- announcements -----------------------------------------------------------
    for title, body, aud, pub in [
        ("Spring Gala tickets are live!", "Member tickets are $20, non-member $35. Gold members get priority seating. Grab yours in the Events tab.", "ALL", True),
        ("General meeting this Thursday", "We're electing next year's leadership team. Pizza provided, bring your student ID.", "MEMBERS", True),
        ("Volunteer briefing: bake sale", "Volunteers - please check your task list and confirm what you're bringing.", "VOLUNTEERS", True),
        ("Draft: Hoodie pre-order reminder", "Last call for hoodie sizes. Stock is limited.", "ALL", False)]:
        db.add(Announcement(id=new_id(), organization_id=s(org.id), title=title, content=body, audience_type=aud,
                            status="PUBLISHED" if pub else "DRAFT", created_by=s(U("head").id), published_at=now() if pub else None))
    # ---- merchandise -------------------------------------------------------------
    from app.api.v1.products import _add_variant
    from app.schemas.requests import VariantIn
    ctx_inv = SimpleNamespace(user=U("inv"), org_id=s(org.id), request=None)

    def prod(name, desc, cat, price, variants):
        p = Product(id=new_id(), organization_id=s(org.id), name=name, description=desc, category=cat, base_price=price)
        db.add(p)
        db.flush()
        for v in variants:
            _add_variant(db, ctx_inv, p, v)
        return p
    hoodie = prod("Skyline Hoodie", "Heavyweight fleece hoodie with the embroidered skyline crest.", "Hoodies", 42,
                  [VariantIn(sku=f"HOOD-{z}", size=z, color="Navy", quantity=q, low_stock_threshold=4) for z, q in (("S", 12), ("M", 20), ("L", 15), ("XL", 3))])
    prod("Club T-Shirt", "Soft cotton tee in club colors.", "T-Shirts", 18,
         [VariantIn(sku=f"TEE-{z}", size=z, color="White", quantity=q, low_stock_threshold=6) for z, q in (("S", 30), ("M", 25), ("L", 4))])
    prod("Canvas Tote", "Everyday tote with the club logo.", "Accessories", 10, [VariantIn(sku="TOTE-OS", size="One size", color="Natural", quantity=40, low_stock_threshold=8)])
    db.flush()
    from app.models.merchandise import ProductVariant
    vm = db.query(ProductVariant).filter(ProductVariant.sku == "HOOD-M").first()
    vl = db.query(ProductVariant).filter(ProductVariant.sku == "HOOD-L").first()
    vt = db.query(ProductVariant).filter(ProductVariant.sku == "TEE-M").first()
    for k, items in (("john", [(vm, 1), (vt, 2)]), ("maya", [(vl, 1)]), ("lena", [(vt, 1)])):
        c = SimpleNamespace(user=U(k), org_id=s(org.id))
        osvc.place_order(db, c, [OrderItemIn(variant_id=s(v.id), quantity=n) for v, n in items], "CARD", M(k))
    # ---- volunteers / fundraisers -----------------------------------------------
    vols = {}
    for k, skills, avail in (("vol", "Baking, social media", "Weekends"), ("lena", "Design, event setup", "Weekday evenings")):
        vols[k] = VolunteerProfile(id=new_id(), organization_id=s(org.id), member_id=s(M(k).id), skills=skills, availability=avail)
        db.add(vols[k])
    db.flush()
    bake = Fundraiser(id=new_id(), organization_id=s(org.id), name="Spring Bake Sale", description="Table outside the library; all proceeds fund the Spring Gala.",
                      target_amount=500, start_date=today() - timedelta(days=3), end_date=today() + timedelta(days=9), status="ACTIVE", created_by=s(U("coord").id))
    db.add(bake)
    db.add(Fundraiser(id=new_id(), organization_id=s(org.id), name="Hoodie Crowdfund", description="Pre-orders to fund the next hoodie batch.",
                      target_amount=1200, start_date=today() + timedelta(days=14), status="PLANNED", created_by=s(U("coord").id)))
    db.flush()
    ledger.record(db, org.id, ledger.INCOME, "FUNDRAISER", 140, U("coord").id, "Bake sale - Saturday table", "FUNDRAISER", bake.id)
    ledger.record(db, org.id, ledger.INCOME, "FUNDRAISER", 75.50, U("coord").id, "Bake sale - Sunday table", "FUNDRAISER", bake.id)
    for title, desc, pri, status, who in [
        ("Bake 3 dozen cookies", "Chocolate chip + oatmeal.", "HIGH", "IN_PROGRESS", ["vol"]),
        ("Buy supplies", "Flour, sugar, packaging, price signs.", "MEDIUM", "DONE", ["lena"]),
        ("Manage the table (Sat 10-2)", "Cash box, signage, queue.", "MEDIUM", "TODO", ["vol", "lena"]),
        ("Post on social media", "Countdown posts + photo.", "LOW", "TODO", [])]:
        t = Task(id=new_id(), organization_id=s(org.id), fundraiser_id=s(bake.id), title=title, description=desc, priority=pri,
                 status=status, due_date=now() + timedelta(days=5), created_by=s(U("coord").id))
        db.add(t)
        db.flush()
        for w in who:
            db.add(TaskAssignment(id=new_id(), task_id=s(t.id), volunteer_id=s(vols[w].id), assigned_by=s(U("coord").id),
                                  completed_at=now() if status == "DONE" else None))
    # ---- expenses ---------------------------------------------------------------
    def exp(user, cat, desc, amt, days_ago, receipt=True):
        e = Expense(id=new_id(), organization_id=s(org.id), submitted_by=s(user.id), category=cat, description=desc, amount=amt,
                    expense_date=today() - timedelta(days=days_ago), status="SUBMITTED")
        db.add(e)
        db.flush()
        if receipt:
            db.add(ExpenseReceipt(id=new_id(), expense_id=s(e.id), file_name=f"receipt-{s(e.id)[:6]}.jpg", file_url=f"/uploads/receipt-{s(e.id)[:6]}.jpg",
                                  mime_type="image/jpeg", uploaded_by=s(user.id)))
        return e
    ctx_tr = SimpleNamespace(user=U("treas"), org_id=s(org.id), request=None)
    e1 = exp(U("lena"), "SUPPLIES", "Bake sale ingredients and packaging", 48.50, 4)
    xsvc.review(db, ctx_tr, e1, "APPROVE")
    xsvc.reimburse(db, ctx_tr, e1, "BANK_TRANSFER", "BT-20481")
    e2 = exp(U("vol"), "SUPPLIES", "Poster printing for Open Mic", 32.00, 2)
    e3 = exp(U("events"), "EVENT_EXPENSE", "Sound equipment rental - Welcome Mixer", 120.00, 6)
    xsvc.review(db, ctx_tr, e3, "APPROVE")
    e4 = exp(U("vol"), "OTHER_EXPENSE", "Team coffee run", 22.00, 5, receipt=False)
    xsvc.review(db, ctx_tr, e4, "REJECT", "No receipt provided")
    ledger.record(db, org.id, ledger.INCOME, "OTHER_INCOME", 100, U("treas").id, "Alumni donation", "MANUAL")
    ledger.record(db, org.id, ledger.EXPENSE, "EVENT_EXPENSE", 60, U("treas").id, "Venue deposit - Spring Gala", "MANUAL")
    db.flush()


def init_all(db: Session, seed_demo_data: bool = True) -> None:
    org = db.query(Organization).order_by(Organization.created_at).first()
    if not org:
        org = Organization(id=new_id(), name="Skyline Student Association", slug="skyline-student-association",
                           email="contact@skyline-sa.org", academic_year="2026-27",
                           description="The student association behind Skyline campus events, merch and community.")
        db.add(org)
        db.flush()
    for o in db.query(Organization).all():
        ensure_rbac(db, o)
    if seed_demo_data:
        seed_demo(db, org)
    db.commit()
