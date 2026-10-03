T = {}
T["base.html"] = """<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Skyline Student Association</title><style>
body{font-family:system-ui,sans-serif;margin:0;background:#f4f6fa;color:#1d2433}
nav{background:#1f3a8a;padding:10px 20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
nav a{color:#fff;text-decoration:none;font-size:14px}nav b{color:#fff;margin-right:10px}
main{max-width:900px;margin:20px auto;padding:0 16px}
.card{background:#fff;border-radius:10px;padding:16px;margin-bottom:14px;box-shadow:0 1px 3px #0001}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:7px;border-bottom:1px solid #eee;text-align:left}
input,select,textarea{padding:7px;margin:3px 0;border:1px solid #ccd;border-radius:6px;font:inherit;max-width:100%}
button{background:#1f3a8a;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;font:inherit}
.flash{background:#fff7d6;border:1px solid #e6d27a;padding:10px;border-radius:8px;margin-bottom:12px}
.big{font-size:26px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.ok{color:#0a7a2f;font-weight:600}.bad{color:#b3261e;font-weight:600}.muted{color:#667}
.bar{background:#e3e7f0;border-radius:6px;height:12px}.bar div{background:#1f3a8a;height:12px;border-radius:6px}
</style></head><body><nav><b>Skyline SA</b>
<a href=/>Home</a><a href=/join>Join</a><a href=/shop>Shop</a><a href=/member-check>Member check</a>
{% if admin %}<span style="color:#9bb">|</span><a href=/admin>Dashboard</a><a href=/admin/members>Members</a><a href=/admin/events>Events</a><a href=/admin/checkin>Check-in</a><a href=/admin/announce>Announce</a><a href=/admin/merch>Merch</a><a href=/admin/fundraisers>Fundraisers</a><a href=/admin/finance>Finance</a><a href=/logout>Logout</a>
{% else %}<a href=/login>Admin login</a>{% endif %}</nav><main>
{% for m in get_flashed_messages() %}<div class=flash>{{m}}</div>{% endfor %}{% block body %}{% endblock %}</main></body></html>"""
def page(body): return '{% extends "base.html" %}{% block body %}' + body + '{% endblock %}'
T["home.html"] = page("""<div class=card><h2>Upcoming events</h2>{% for e in events %}<p><b>{{e.name}}</b> - {{e.date}} | Members Rs {{e.member_price|int}} / Public Rs {{e.public_price|int}} | {{e.left}} seats left
{% if e.left>0 %}<a href=/events/{{e.id}}/buy>Buy ticket</a>{% else %}<span class=bad>Sold out</span>{% endif %}</p>{% else %}<p class=muted>No upcoming events.</p>{% endfor %}</div>
<div class=card><h2>Announcements</h2>{% for n in news %}<p><b>{{n.title}}</b> <span class=muted>({{n.posted}})</span><br>{{n.body}}</p>{% else %}<p class=muted>Nothing yet.</p>{% endfor %}</div>""")
T["join.html"] = page("""<div class=card><h2>Join the club</h2><p>Yearly dues: Rs {{DUES}} (pay at the desk). Members get cheaper tickets and 10% off merch.</p>
<form method=post>Name<br><input name=name required><br>Email<br><input name=email type=email required><br><br><button>Sign up</button></form></div>""")
T["member_check.html"] = page("""<div class=card><h2>Is this person a member?</h2><form method=post><input name=email type=email placeholder="member email" required> <button>Check</button></form>
{% if res %}{% if res[0] %}<p class=ok>Active member: {{res[1].name}} (valid until {{res[1].expires}})</p>{% elif res[1] %}<p class=bad>{{res[1].name}} is registered but NOT active (dues unpaid or expired).</p>{% else %}<p class=bad>Not found.</p>{% endif %}{% endif %}</div>""")
T["buy.html"] = page("""<div class=card><h2>{{ev.name}} - {{ev.date}}</h2><p>Members Rs {{ev.member_price|int}} / Public Rs {{ev.public_price|int}} | <b>{{left}}</b> seats left</p>
{% if left>0 %}<form method=post>Name<br><input name=name required><br>Email (use your member email for the member price)<br><input name=email type=email required><br><br><button>Get ticket</button></form>{% else %}<p class=bad>Sold out.</p>{% endif %}</div>""")
T["ticket.html"] = page("""<div class=card><h2>Your ticket</h2><p>{{ev.name}} - {{ev.date}}</p><p class=big>{{code}}</p><p>{{name}} | Rs {{price|int}} {% if member %}(member price){% endif %}</p><p class=muted>Show this code at the door. Pay at the desk if not paid online.</p></div>""")
T["shop.html"] = page("""<div class=card><h2>Merch</h2><p class=muted>Members get {{MERCH_DISCOUNT}}% off (use your member email).</p>
{% for m in items %}<h3>{{m.name}} - Rs {{m.price|int}}</h3><form method=post>Size <select name=stock_id>{% for s in stock[m.id] %}<option value={{s.id}} {% if s.qty<=0 %}disabled{% endif %}>{{s.size}} ({{s.qty}} left)</option>{% endfor %}</select>
<input name=name placeholder=Name required> <input name=email type=email placeholder=Email required> <button>Order</button></form>{% else %}<p>No items yet.</p>{% endfor %}</div>""")
T["login.html"] = page("""<div class=card><h2>Admin login</h2><form method=post><input name=user placeholder=username><br><input name=password type=password placeholder=password><br><br><button>Login</button></form></div>""")
T["dashboard.html"] = page("""<div class=grid><div class=card>Members<div class=big>{{members}}</div>{{active}} active</div><div class=card>Income<div class=big>Rs {{inc|int}}</div></div><div class=card>Expenses<div class=big>Rs {{out|int}}</div></div><div class=card>Balance<div class=big>Rs {{(inc-out)|int}}</div></div></div>
<div class=card><h3>Renewals due (next 30 days / expired)</h3><table>{% for m in renew %}<tr><td>{{m.name}}</td><td>{{m.email}}</td><td>{{m.expires}}</td><td>{% if m.expires<today %}<span class=bad>expired</span>{% else %}expiring{% endif %}</td></tr>{% else %}<tr><td class=muted>None</td></tr>{% endfor %}</table></div>
<div class=card>Unpaid merch orders: <b>{{unpaid_orders}}</b></div>""")
T["members.html"] = page("""<div class=card><h2>Members</h2><table><tr><th>Name<th>Email<th>Status<th>Expires<th></tr>{% for m in rows %}<tr><td>{{m.name}}<td>{{m.email}}<td>{% if m.expires and m.expires>=today %}<span class=ok>Active</span>{% elif m.expires %}<span class=bad>Expired</span>{% else %}<span class=bad>Unpaid</span>{% endif %}<td>{{m.expires or '-'}}
<td><form method=post><input type=hidden name=id value={{m.id}}><button>{% if m.expires %}Renew{% else %}Mark paid{% endif %} (Rs {{DUES}})</button></form></tr>{% endfor %}</table></div>""")
T["events.html"] = page("""<div class=card><h2>New event</h2><form method=post><input name=name placeholder="Event name" required> <input name=date type=date required> <input name=member_price type=number placeholder="Member price" required> <input name=public_price type=number placeholder="Public price" required> <input name=capacity type=number placeholder=Seats required> <button>Create</button></form></div>
<div class=card><h2>Events</h2><table><tr><th>Event<th>Date<th>Sold/Seats<th>Attended<th>Revenue</tr>{% for e in rows %}<tr><td>{{e.name}}<td>{{e.date}}<td>{{e.sold}}/{{e.capacity}}<td>{{e.attended}}<td>Rs {{e.revenue|int}}</tr>{% endfor %}</table></div>""")
T["checkin.html"] = page("""<div class=card><h2>Door check-in</h2><form method=post><input name=code placeholder="Ticket code" autofocus required> <button>Check in</button></form>{% if msg %}<p class={{msg[0]}}>{{msg[1]}}</p>{% endif %}</div>""")
T["announce.html"] = page("""<div class=card><h2>Post announcement</h2><form method=post><input name=title placeholder=Title required style="width:100%"><br><textarea name=body rows=4 placeholder=Message required style="width:100%"></textarea><br><button>Post</button></form></div>
<div class=card><h3>Mailing list (copy into BCC)</h3><p class=muted style="word-break:break-all">{{emails or 'No members yet'}}</p></div>
<div class=card><h3>History</h3>{% for n in rows %}<p><b>{{n.title}}</b> <span class=muted>{{n.posted}} - sent to {{n.recipients}}</span><br>{{n.body}}</p>{% endfor %}</div>""")
T["merch_admin.html"] = page("""<div class=card><h2>Add item</h2><form method=post><input type=hidden name=action value=item><input name=name placeholder=Name required> <input name=price type=number placeholder=Price required> <button>Add</button></form></div>
<div class=card><h2>Stock</h2>{% for m in items %}<b>{{m.name}}</b>{% for s in stock[m.id] %}<form method=post style=display:inline-block;margin:4px><input type=hidden name=action value=stock><input type=hidden name=id value={{s.id}}>{{s.size}} <input name=qty type=number value={{s.qty}} style=width:60px><button>Save</button></form>{% endfor %}<br>{% endfor %}</div>
<div class=card><h2>Orders</h2><table>{% for o in orders %}<tr><td>#{{o.id}}<td>{{o.mname}} ({{o.size}})<td>{{o.name}}<td>Rs {{o.total|int}}<td>{% if o.paid %}<span class=ok>Paid</span>{% else %}<form method=post><input type=hidden name=action value=paid><input type=hidden name=id value={{o.id}}><button>Mark paid</button></form>{% endif %}</tr>{% endfor %}</table></div>""")
T["fundraisers.html"] = page("""<div class=card><h2>New fundraiser</h2><form method=post><input type=hidden name=action value=new><input name=name placeholder=Name required> <input name=goal type=number placeholder="Goal (Rs)"> <button>Create</button></form></div>
{% for r in rows %}<div class=card><h3>{{r.f.name}} <span class=muted>(goal Rs {{r.f.goal|int}})</span></h3><div class=bar><div style="width:{{r.pct}}%"></div></div><p>{{r.done}}/{{r.tasks|length}} tasks done ({{r.pct}}%)</p>
<table>{% for t in r.tasks %}<tr><td>{{'Done' if t.done else 'To do'}}<td>{{t.title}}<td>{{t.assignee}}<td><form method=post><input type=hidden name=action value=toggle><input type=hidden name=id value={{t.id}}><button>Toggle</button></form></tr>{% endfor %}</table>
<form method=post><input type=hidden name=action value=task><input type=hidden name=fid value={{r.f.id}}><input name=title placeholder=Task required> <input name=assignee placeholder="Who?" required> <button>Add task</button></form>
<form method=post><input type=hidden name=action value=raised><input name=amount type=number placeholder="Amount raised" required> <input name=note placeholder="Note"> <button>Record proceeds</button></form></div>{% endfor %}""")
T["finance.html"] = page("""<div class=grid><div class=card>In<div class=big>Rs {{inc|int}}</div></div><div class=card>Out<div class=big>Rs {{out|int}}</div></div><div class=card>Left<div class=big>Rs {{(inc-out)|int}}</div></div></div>
<div class=card><h3>By category</h3><table>{% for c in cats %}<tr><td>{{'Income' if c.kind=='in' else 'Expense'}}<td>{{c.category}}<td>Rs {{c.total|int}}</tr>{% endfor %}</table></div>
<div class=card><h3>Add expense</h3><form method=post><input name=category placeholder="Category (Food, Venue...)" required> <input name=amount type=number step=any placeholder=Amount required> <input name=note placeholder="Who / what"> <label><input type=checkbox name=reimbursed checked> reimbursed</label> <button>Add</button></form></div>
<div class=card><h3>Ledger</h3><table>{% for r in rows %}<tr><td>{{r.day}}<td>{{'+' if r.kind=='in' else '-'}}Rs {{r.amount|int}}<td>{{r.category}}<td>{{r.note}}<td>{% if r.kind=='out' and not r.reimbursed %}<span class=bad>owed</span>{% endif %}</tr>{% endfor %}</table></div>""")
TEMPLATES = T
