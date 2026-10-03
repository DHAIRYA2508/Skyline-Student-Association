"""Skyline Student Association - simple all-in-one system (Flask + SQLite).
Run:  pip install -r requirements.txt && python app.py   ->  http://localhost:5000
Admin login: admin / admin123  (change ADMIN_PASSWORD below or via env var)
"""
import os, sqlite3, secrets
from datetime import date, timedelta
from functools import wraps
from flask import Flask, g, request, redirect, url_for, session, flash, render_template, abort
from jinja2 import DictLoader, ChoiceLoader
from templates_data import TEMPLATES

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")
app.jinja_loader = ChoiceLoader([DictLoader(TEMPLATES)])
DB = os.path.join(os.path.dirname(__file__), "ssa.db")
ADMIN_USER = "admin"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
DUES = 500            # yearly membership dues
MERCH_DISCOUNT = 10   # % off merch for members

SCHEMA = """
CREATE TABLE IF NOT EXISTS members(id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, joined TEXT, expires TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, name TEXT, date TEXT, member_price REAL, public_price REAL, capacity INTEGER);
CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY, event_id INTEGER, name TEXT, email TEXT, price REAL, code TEXT UNIQUE, checked_in INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY, title TEXT, body TEXT, posted TEXT, recipients INTEGER);
CREATE TABLE IF NOT EXISTS merch(id INTEGER PRIMARY KEY, name TEXT, price REAL);
CREATE TABLE IF NOT EXISTS stock(id INTEGER PRIMARY KEY, merch_id INTEGER, size TEXT, qty INTEGER);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, merch_id INTEGER, size TEXT, name TEXT, email TEXT, total REAL, paid INTEGER DEFAULT 0, created TEXT);
CREATE TABLE IF NOT EXISTS fundraisers(id INTEGER PRIMARY KEY, name TEXT, goal REAL);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY, fundraiser_id INTEGER, title TEXT, assignee TEXT, done INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY, day TEXT, kind TEXT, category TEXT, amount REAL, note TEXT, reimbursed INTEGER DEFAULT 1);
"""

def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB); g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close(_):
    d = g.pop("db", None)
    if d: d.close()

def q(sql, *a): return db().execute(sql, a).fetchall()
def q1(sql, *a): return db().execute(sql, a).fetchone()
def run(sql, *a):
    c = db().execute(sql, a); db().commit(); return c.lastrowid

def init():
    with sqlite3.connect(DB) as c: c.executescript(SCHEMA)

def admin_only(f):
    @wraps(f)
    def w(*a, **k):
        if not session.get("admin"):
            flash("Please log in as admin."); return redirect(url_for("login"))
        return f(*a, **k)
    return w

def is_member(email):
    m = q1("SELECT * FROM members WHERE lower(email)=lower(?)", email.strip())
    return bool(m and m["expires"] and m["expires"] >= str(date.today())), m

def income(category, amount, note): run("INSERT INTO ledger(day,kind,category,amount,note) VALUES(?,?,?,?,?)", str(date.today()), "in", category, amount, note)

@app.context_processor
def inject(): return dict(admin=session.get("admin"), today=str(date.today()), DUES=DUES)

# ---------- public ----------
@app.route("/")
def home():
    return render_template("home.html",
        news=q("SELECT * FROM announcements ORDER BY id DESC LIMIT 5"),
        events=q("SELECT e.*, e.capacity-(SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id) AS left FROM events e WHERE date>=? ORDER BY date", str(date.today())))

@app.route("/join", methods=["GET", "POST"])
def join():
    if request.method == "POST":
        n, e = request.form["name"].strip(), request.form["email"].strip().lower()
        if not n or not e: flash("Name and email required.")
        elif q1("SELECT 1 FROM members WHERE email=?", e): flash("That email is already registered.")
        else:
            run("INSERT INTO members(name,email,joined,expires) VALUES(?,?,?,NULL)", n, e, str(date.today()))
            flash(f"Welcome {n}! Pay Rs {DUES} dues at the desk to activate your membership."); return redirect(url_for("home"))
    return render_template("join.html")

@app.route("/member-check", methods=["GET", "POST"])
def member_check():
    res = None
    if request.method == "POST":
        ok, m = is_member(request.form["email"]); res = (ok, m)
    return render_template("member_check.html", res=res)

@app.route("/events/<int:eid>/buy", methods=["GET", "POST"])
def buy_ticket(eid):
    ev = q1("SELECT * FROM events WHERE id=?", eid) or abort(404)
    sold = q1("SELECT COUNT(*) c FROM tickets WHERE event_id=?", eid)["c"]
    left = ev["capacity"] - sold
    price = None
    if request.method == "POST":
        n, e = request.form["name"].strip(), request.form["email"].strip().lower()
        ok, _ = is_member(e); price = ev["member_price"] if ok else ev["public_price"]
        if left <= 0: flash("Sold out!")
        elif not n or not e: flash("Name and email required.")
        else:
            code = secrets.token_hex(3).upper()
            run("INSERT INTO tickets(event_id,name,email,price,code) VALUES(?,?,?,?,?)", eid, n, e, price, code)
            income("Tickets", price, f"{ev['name']} - {n}")
            return render_template("ticket.html", ev=ev, code=code, name=n, price=price, member=ok)
    return render_template("buy.html", ev=ev, left=left)

@app.route("/shop", methods=["GET", "POST"])
def shop():
    if request.method == "POST":
        sid = int(request.form["stock_id"]); n, e = request.form["name"].strip(), request.form["email"].strip().lower()
        s = q1("SELECT s.*, m.name mname, m.price FROM stock s JOIN merch m ON m.id=s.merch_id WHERE s.id=?", sid)
        if not s or s["qty"] <= 0: flash("Out of stock.")
        elif not n or not e: flash("Name and email required.")
        else:
            ok, _ = is_member(e); total = s["price"] * (1 - MERCH_DISCOUNT / 100 if ok else 1)
            run("UPDATE stock SET qty=qty-1 WHERE id=?", sid)
            run("INSERT INTO orders(merch_id,size,name,email,total,created) VALUES(?,?,?,?,?,?)", s["merch_id"], s["size"], n, e, total, str(date.today()))
            flash(f"Order placed: {s['mname']} ({s['size']}) - Rs {total:.0f}{' (member discount applied)' if ok else ''}. Pay at the desk."); return redirect(url_for("shop"))
    items = q("SELECT * FROM merch")
    stock = {m["id"]: q("SELECT * FROM stock WHERE merch_id=? ORDER BY id", m["id"]) for m in items}
    return render_template("shop.html", items=items, stock=stock, MERCH_DISCOUNT=MERCH_DISCOUNT)

# ---------- admin ----------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form["user"] == ADMIN_USER and request.form["password"] == ADMIN_PASSWORD:
            session["admin"] = True; return redirect(url_for("dashboard"))
        flash("Wrong username or password.")
    return render_template("login.html")

@app.route("/logout")
def logout(): session.clear(); return redirect(url_for("home"))

@app.route("/admin")
@admin_only
def dashboard():
    soon = str(date.today() + timedelta(days=30))
    inc = q1("SELECT COALESCE(SUM(amount),0) s FROM ledger WHERE kind='in'")["s"]
    out = q1("SELECT COALESCE(SUM(amount),0) s FROM ledger WHERE kind='out'")["s"]
    return render_template("dashboard.html", inc=inc, out=out,
        members=q1("SELECT COUNT(*) c FROM members")["c"],
        active=q1("SELECT COUNT(*) c FROM members WHERE expires>=?", str(date.today()))["c"],
        renew=q("SELECT * FROM members WHERE expires IS NOT NULL AND expires<=? ORDER BY expires", soon),
        unpaid_orders=q1("SELECT COUNT(*) c FROM orders WHERE paid=0")["c"])

@app.route("/admin/members", methods=["GET", "POST"])
@admin_only
def members():
    if request.method == "POST":
        mid = int(request.form["id"]); m = q1("SELECT * FROM members WHERE id=?", mid)
        start = max(date.today(), date.fromisoformat(m["expires"])) if m["expires"] else date.today()
        run("UPDATE members SET expires=? WHERE id=?", str(date(start.year, 12, 31) if m["expires"] is None else date(start.year + 1, 12, 31)), mid)
        income("Dues", DUES, f"Membership - {m['name']}"); flash(f"Dues recorded for {m['name']}."); return redirect(url_for("members"))
    return render_template("members.html", rows=q("SELECT * FROM members ORDER BY name"))

@app.route("/admin/events", methods=["GET", "POST"])
@admin_only
def events():
    if request.method == "POST":
        f = request.form
        run("INSERT INTO events(name,date,member_price,public_price,capacity) VALUES(?,?,?,?,?)", f["name"], f["date"], float(f["member_price"]), float(f["public_price"]), int(f["capacity"]))
        flash("Event created."); return redirect(url_for("events"))
    rows = q("""SELECT e.*, (SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id) sold,
      (SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id AND checked_in=1) attended,
      (SELECT COALESCE(SUM(price),0) FROM tickets t WHERE t.event_id=e.id) revenue FROM events e ORDER BY date DESC""")
    return render_template("events.html", rows=rows)

@app.route("/admin/checkin", methods=["GET", "POST"])
@admin_only
def checkin():
    msg = None
    if request.method == "POST":
        t = q1("SELECT t.*, e.name ev FROM tickets t JOIN events e ON e.id=t.event_id WHERE code=?", request.form["code"].strip().upper())
        if not t: msg = ("bad", "Invalid ticket code.")
        elif t["checked_in"]: msg = ("bad", f"Already checked in: {t['name']}.")
        else:
            run("UPDATE tickets SET checked_in=1 WHERE id=?", t["id"]); msg = ("ok", f"Welcome {t['name']} - {t['ev']}")
    return render_template("checkin.html", msg=msg)

@app.route("/admin/announce", methods=["GET", "POST"])
@admin_only
def announce():
    if request.method == "POST":
        n = q1("SELECT COUNT(*) c FROM members")["c"]
        run("INSERT INTO announcements(title,body,posted,recipients) VALUES(?,?,?,?)", request.form["title"], request.form["body"], str(date.today()), n)
        flash(f"Posted on the website and queued for {n} members' emails (see mailing list below)."); return redirect(url_for("announce"))
    return render_template("announce.html", rows=q("SELECT * FROM announcements ORDER BY id DESC"),
                           emails=", ".join(r["email"] for r in q("SELECT email FROM members")))

@app.route("/admin/merch", methods=["GET", "POST"])
@admin_only
def merch_admin():
    f = request.form
    if request.method == "POST":
        if f["action"] == "item":
            mid = run("INSERT INTO merch(name,price) VALUES(?,?)", f["name"], float(f["price"]))
            for s in ["S", "M", "L", "XL"]: run("INSERT INTO stock(merch_id,size,qty) VALUES(?,?,0)", mid, s)
        elif f["action"] == "stock": run("UPDATE stock SET qty=? WHERE id=?", int(f["qty"]), int(f["id"]))
        elif f["action"] == "paid":
            o = q1("SELECT * FROM orders WHERE id=?", int(f["id"]))
            if o and not o["paid"]: run("UPDATE orders SET paid=1 WHERE id=?", o["id"]); income("Merchandise", o["total"], f"Order #{o['id']} - {o['name']}")
        return redirect(url_for("merch_admin"))
    items = q("SELECT * FROM merch")
    return render_template("merch_admin.html", items=items, stock={m["id"]: q("SELECT * FROM stock WHERE merch_id=?", m["id"]) for m in items},
        orders=q("SELECT o.*, m.name mname FROM orders o JOIN merch m ON m.id=o.merch_id ORDER BY o.id DESC"))

@app.route("/admin/fundraisers", methods=["GET", "POST"])
@admin_only
def fundraisers():
    f = request.form
    if request.method == "POST":
        a = f["action"]
        if a == "new": run("INSERT INTO fundraisers(name,goal) VALUES(?,?)", f["name"], float(f["goal"] or 0))
        elif a == "task": run("INSERT INTO tasks(fundraiser_id,title,assignee) VALUES(?,?,?)", int(f["fid"]), f["title"], f["assignee"])
        elif a == "toggle": run("UPDATE tasks SET done=1-done WHERE id=?", int(f["id"]))
        elif a == "raised": income("Fundraiser", float(f["amount"]), f["note"] or "Fundraiser proceeds")
        return redirect(url_for("fundraisers"))
    rows = []
    for fr in q("SELECT * FROM fundraisers"):
        t = q("SELECT * FROM tasks WHERE fundraiser_id=?", fr["id"]); d = sum(x["done"] for x in t)
        rows.append(dict(f=fr, tasks=t, done=d, pct=int(100 * d / len(t)) if t else 0))
    return render_template("fundraisers.html", rows=rows)

@app.route("/admin/finance", methods=["GET", "POST"])
@admin_only
def finance():
    if request.method == "POST":
        f = request.form
        run("INSERT INTO ledger(day,kind,category,amount,note,reimbursed) VALUES(?,?,?,?,?,?)", str(date.today()), "out", f["category"], float(f["amount"]), f["note"], 1 if f.get("reimbursed") else 0)
        flash("Expense recorded."); return redirect(url_for("finance"))
    cats = q("SELECT kind, category, SUM(amount) total FROM ledger GROUP BY kind, category ORDER BY kind DESC, total DESC")
    inc = sum(c["total"] for c in cats if c["kind"] == "in"); out = sum(c["total"] for c in cats if c["kind"] == "out")
    return render_template("finance.html", cats=cats, inc=inc, out=out, rows=q("SELECT * FROM ledger ORDER BY id DESC"))

def seed():
    if q1("SELECT COUNT(*) c FROM events")["c"]: return
    run("INSERT INTO events(name,date,member_price,public_price,capacity) VALUES('Spring Gala',?,300,500,100)", str(date.today() + timedelta(days=30)))
    m = run("INSERT INTO merch(name,price) VALUES('Skyline Hoodie',900)"); [run("INSERT INTO stock(merch_id,size,qty) VALUES(?,?,10)", m, s) for s in ["S", "M", "L", "XL"]]
    run("INSERT INTO announcements(title,body,posted,recipients) VALUES('Welcome!','Join us at the first meeting of the semester.',?,0)", str(date.today()))
    fid = run("INSERT INTO fundraisers(name,goal) VALUES('Bake Sale',5000)")
    for t, a in [("Bake cookies", "Asha"), ("Buy supplies", "Ravi"), ("Run the table", "Meera")]: run("INSERT INTO tasks(fundraiser_id,title,assignee) VALUES(?,?,?)", fid, t, a)

init()
with app.app_context(): seed()
if __name__ == "__main__":
    app.run(debug=True)
