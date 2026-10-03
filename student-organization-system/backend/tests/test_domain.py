from datetime import date, timedelta

API = "/api/v1"


def plans(client, h):
    return {p["name"]: p for p in client.get(f"{API}/memberships/plans", headers=h).json()}


# ---------------- membership ----------------
def test_join_pay_activate_and_ledger(client, H):
    p = plans(client, H.new)["Gold Annual"]
    before = client.get(f"{API}/finance/summary", headers=H.treas).json()["income_by_category"]["MEMBERSHIP_DUES"]
    r = client.post(f"{API}/memberships/join", headers=H.new, json={"plan_id": p["id"], "payment_method": "CARD"})
    assert r.status_code == 201
    m = r.json()["membership"]
    assert m["state"] == "ACTIVE" and m["is_active"] and m["benefits"] and m["days_until_expiry"] >= 360
    after = client.get(f"{API}/finance/summary", headers=H.treas).json()["income_by_category"]["MEMBERSHIP_DUES"]
    assert round(after - before, 2) == 25.0


def test_renewal_extends_and_expiry_states(client, H):
    me = client.get(f"{API}/memberships/me", headers=H.john).json()["summary"]
    p = plans(client, H.john)["Student Basic"]
    r = client.post(f"{API}/memberships/join", headers=H.john, json={"plan_id": p["id"]}).json()["membership"]
    assert r["end_date"] > me["end_date"]  # renewal stacks on top of remaining time
    omar = client.get(f"{API}/memberships/me", headers=H.omar).json()["summary"]
    assert omar["state"] == "EXPIRED" and omar["needs_renewal"] and not omar["is_active"]
    # renewing an expired membership reactivates it
    r2 = client.post(f"{API}/memberships/join", headers=H.omar, json={"plan_id": p["id"]}).json()["membership"]
    assert r2["state"] == "ACTIVE"


def test_expiring_soon_flagged_and_verify(client, H):
    exp = client.get(f"{API}/memberships/expiring", headers=H.head).json()
    assert any(e["email"] == "maya.chen@skyline.edu" for e in exp)
    v = client.get(f"{API}/members/verify", params={"query": "SKY-89201"}, headers=H.events).json()
    assert v["found"] and v["member"]["is_active_member"]
    v2 = client.get(f"{API}/members/verify", params={"query": "SKY-10012"}, headers=H.events).json()
    assert v2["found"] and not v2["member"]["is_active_member"]


# ---------------- events & tickets ----------------
def gala(client, h):
    return next(e for e in client.get(f"{API}/events", headers=h).json() if e["name"] == "Spring Gala")


def test_member_vs_nonmember_pricing(client, H):
    g = gala(client, H.john)
    t = client.post(f"{API}/tickets/purchase", headers=H.john, json={"event_id": g["id"]}).json()["tickets"][0]
    assert t["ticket_type"] == "MEMBER" and t["price"] == 20.0
    n = client.post(f"{API}/tickets/purchase", headers=H.new, json={"event_id": g["id"]}).json()["tickets"][0]
    assert n["ticket_type"] == "NON_MEMBER" and n["price"] == 35.0
    o = client.post(f"{API}/tickets/purchase", headers=H.omar, json={"event_id": g["id"]}).json()["tickets"][0]
    assert o["ticket_type"] == "NON_MEMBER"  # lapsed membership gets no member price


def test_capacity_cannot_be_exceeded(client, H):
    e = client.post(f"{API}/events", headers=H.events, json={
        "name": "Tiny Event", "start_datetime": (date.today() + timedelta(days=3)).isoformat() + "T18:00:00",
        "end_datetime": (date.today() + timedelta(days=3)).isoformat() + "T20:00:00", "capacity": 2,
        "member_price": 1, "non_member_price": 2}).json()
    assert client.post(f"{API}/tickets/purchase", headers=H.john, json={"event_id": e["id"]}).status_code == 400  # draft
    client.post(f"{API}/events/{e['id']}/publish", headers=H.events)
    assert client.post(f"{API}/tickets/purchase", headers=H.john, json={"event_id": e["id"], "quantity": 2}).status_code == 201
    r = client.post(f"{API}/tickets/purchase", headers=H.new, json={"event_id": e["id"]})
    assert r.status_code == 409 and "left" in r.json()["detail"]


def test_checkin_unique_codes_duplicate_and_cancelled(client, H):
    g = gala(client, H.john)
    tk = client.post(f"{API}/tickets/purchase", headers=H.john, json={"event_id": g["id"], "quantity": 2}).json()["tickets"]
    assert len({t["ticket_code"] for t in tk}) == 2 and len({t["qr_token"] for t in tk}) == 2
    assert client.post(f"{API}/tickets/check-in", headers=H.events, json={"code": tk[0]["ticket_code"]}).status_code == 200
    dup = client.post(f"{API}/tickets/check-in", headers=H.events, json={"code": tk[0]["qr_token"], "method": "QR"})
    assert dup.status_code == 409 and "already" in dup.json()["detail"]
    # cancel + refund -> cannot check in; ledger reversed
    before = client.get(f"{API}/finance/summary", headers=H.treas).json()["income_by_category"]["EVENT_TICKETS"]
    assert client.post(f"{API}/tickets/{tk[1]['id']}/cancel", headers=H.events).json()["status"] == "REFUNDED"
    after = client.get(f"{API}/finance/summary", headers=H.treas).json()["income_by_category"]["EVENT_TICKETS"]
    assert round(before - after, 2) == 20.0
    assert client.post(f"{API}/tickets/check-in", headers=H.events, json={"code": tk[1]["ticket_code"]}).status_code == 409
    assert client.post(f"{API}/tickets/check-in", headers=H.john, json={"code": tk[1]["ticket_code"]}).status_code == 403


def test_event_stats(client, H):
    past = next(e for e in client.get(f"{API}/events", headers=H.events, params={"scope": "past"}).json())
    st = past["stats"]
    assert st["checked_in"] == 7 and st["sold"] == 9 and st["no_shows"] == 2 and st["revenue"] > 0


# ---------------- inventory & orders ----------------
def variant(client, h, sku):
    for p in client.get(f"{API}/products", headers=h).json():
        for v in p["variants"]:
            if v["sku"] == sku:
                return v


def test_order_deducts_stock_once_and_applies_member_discount(client, H):
    v = variant(client, H.inv, "HOOD-S")
    r = client.post(f"{API}/orders", headers=H.john, json={"items": [{"variant_id": v["id"], "quantity": 2}]})
    assert r.status_code == 201
    o = r.json()
    assert o["subtotal"] == 84.0 and o["discount_amount"] == 12.6 and o["total_amount"] == 71.4  # 15% gold
    assert variant(client, H.inv, "HOOD-S")["quantity"] == v["quantity"] - 2
    assert o["items"][0]["name"] == "Skyline Hoodie"  # snapshot


def test_negative_stock_prevented_and_restore_on_cancel(client, H):
    xl = variant(client, H.inv, "HOOD-XL")  # 3 in stock
    bad = client.post(f"{API}/orders", headers=H.john, json={"items": [{"variant_id": xl["id"], "quantity": 4}]})
    assert bad.status_code == 409
    assert variant(client, H.inv, "HOOD-XL")["quantity"] == 3
    o = client.post(f"{API}/orders", headers=H.new, json={"items": [{"variant_id": xl["id"], "quantity": 3}]}).json()
    assert variant(client, H.inv, "HOOD-XL")["quantity"] == 0
    assert client.post(f"{API}/orders", headers=H.new, json={"items": [{"variant_id": xl["id"], "quantity": 1}]}).status_code == 409
    c = client.post(f"{API}/orders/{o['id']}/status", headers=H.inv, json={"status": "CANCELLED"})
    assert c.status_code == 200 and variant(client, H.inv, "HOOD-XL")["quantity"] == 3
    assert client.post(f"{API}/orders/{o['id']}/status", headers=H.inv, json={"status": "REFUNDED"}).status_code == 409  # no double restore
    assert variant(client, H.inv, "HOOD-XL")["quantity"] == 3


def test_stock_addition_damage_and_guard(client, H):
    v = variant(client, H.inv, "TEE-L")
    r = client.post(f"{API}/inventory/adjust", headers=H.inv, json={"variant_id": v["id"], "transaction_type": "RESTOCK", "quantity": 10})
    assert r.json()["quantity"] == v["quantity"] + 10
    assert client.post(f"{API}/inventory/adjust", headers=H.inv, json={"variant_id": v["id"], "transaction_type": "DAMAGE", "quantity": 999}).status_code == 409
    assert client.post(f"{API}/inventory/adjust", headers=H.john, json={"variant_id": v["id"], "transaction_type": "RESTOCK", "quantity": 1}).status_code == 403
    assert any(t["type"] == "RESTOCK" for t in client.get(f"{API}/inventory/transactions", headers=H.inv).json())


# ---------------- expenses ----------------
def test_expense_lifecycle_and_no_double_reimbursement(client, H):
    e = client.post(f"{API}/expenses", headers=H.vol, json={"category": "SUPPLIES", "description": "Balloons", "amount": 15.25,
                                                           "expense_date": date.today().isoformat(),
                                                           "receipts": [{"file_name": "r.jpg", "file_url": "/u/r.jpg"}]}).json()
    assert e["status"] == "SUBMITTED" and len(e["receipts"]) == 1
    assert client.post(f"{API}/expenses/{e['id']}/review", headers=H.vol, json={"action": "APPROVE"}).status_code == 403
    assert client.post(f"{API}/expenses/{e['id']}/reimburse", headers=H.treas, json={}).status_code == 409  # not approved yet
    assert client.post(f"{API}/expenses/{e['id']}/review", headers=H.treas, json={"action": "REJECT"}).status_code == 400  # reason required
    assert client.post(f"{API}/expenses/{e['id']}/review", headers=H.treas, json={"action": "APPROVE"}).json()["status"] == "APPROVED"
    before = client.get(f"{API}/finance/summary", headers=H.treas).json()
    assert client.post(f"{API}/expenses/{e['id']}/reimburse", headers=H.treas, json={"payment_reference": "X1"}).json()["status"] == "REIMBURSED"
    assert client.post(f"{API}/expenses/{e['id']}/reimburse", headers=H.treas, json={}).status_code == 409
    after = client.get(f"{API}/finance/summary", headers=H.treas).json()
    assert round(after["expenses_by_category"]["REIMBURSEMENT"] - before["expenses_by_category"]["REIMBURSEMENT"], 2) == 15.25
    assert round(before["balance"] - after["balance"], 2) == 15.25


def test_expense_rejection_and_own_expense_rule(client, H):
    e = client.post(f"{API}/expenses", headers=H.treas, json={"category": "SUPPLIES", "description": "Own receipt", "amount": 9,
                                                              "expense_date": date.today().isoformat()}).json()
    assert client.post(f"{API}/expenses/{e['id']}/review", headers=H.treas, json={"action": "APPROVE"}).status_code == 403
    e2 = client.post(f"{API}/expenses", headers=H.vol, json={"category": "SUPPLIES", "description": "Snacks", "amount": 9,
                                                             "expense_date": date.today().isoformat()}).json()
    r = client.post(f"{API}/expenses/{e2['id']}/review", headers=H.treas, json={"action": "REJECT", "reason": "No receipt"}).json()
    assert r["status"] == "REJECTED" and r["rejection_reason"] == "No receipt"
    assert client.post(f"{API}/expenses/{e2['id']}/reimburse", headers=H.treas, json={}).status_code == 409
    mine = client.get(f"{API}/expenses", headers=H.vol).json()
    assert all(x["submitted_by"] == mine[0]["submitted_by"] for x in mine)  # volunteers only see their own


# ---------------- finance ----------------
def test_ledger_balance_reversal_and_immutability(client, H):
    s0 = client.get(f"{API}/finance/summary", headers=H.treas).json()
    assert round(s0["total_income"] - s0["total_expenses"], 2) == s0["balance"]
    tx = client.post(f"{API}/finance/transactions", headers=H.treas, json={"transaction_type": "INCOME", "category": "OTHER_INCOME", "amount": 50, "description": "Sponsor"}).json()
    s1 = client.get(f"{API}/finance/summary", headers=H.treas).json()
    assert round(s1["balance"] - s0["balance"], 2) == 50
    assert client.post(f"{API}/finance/transactions/{tx['id']}/reverse", headers=H.treas, json={"reason": "Entered twice"}).status_code == 201
    s2 = client.get(f"{API}/finance/summary", headers=H.treas).json()
    assert s2["balance"] == s0["balance"] and s2["income_by_category"]["OTHER_INCOME"] == s0["income_by_category"]["OTHER_INCOME"]
    assert client.post(f"{API}/finance/transactions/{tx['id']}/reverse", headers=H.treas, json={"reason": "again"}).status_code == 409
    assert client.post(f"{API}/finance/transactions", headers=H.treas, json={"transaction_type": "INCOME", "category": "OTHER_INCOME", "amount": -5}).status_code == 422
    # ORM-level immutability
    from app.db.session import SessionLocal
    from app.models.finance import Transaction
    import pytest
    db = SessionLocal()
    t = db.query(Transaction).first()
    t.amount = 1
    with pytest.raises(ValueError):
        db.commit()
    db.rollback()
    db.delete(t)
    with pytest.raises(ValueError):
        db.commit()
    db.close()
    assert client.put(f"{API}/finance/transactions/{tx['id']}", headers=H.treas, json={}).status_code in (404, 405)


def test_audit_log_written_and_append_only(client, H):
    client.post(f"{API}/inventory/adjust", headers=H.inv, json={"variant_id": variant(client, H.inv, "TOTE-OS")["id"], "transaction_type": "RESTOCK", "quantity": 1})
    logs = client.get(f"{API}/audit-logs", headers=H.head, params={"action": "INVENTORY"}).json()
    assert logs["total"] >= 1 and logs["items"][0]["actor"] == "Ines Moreau"
    from app.db.session import SessionLocal
    from app.models.audit import AuditLog
    import pytest
    db = SessionLocal()
    a = db.query(AuditLog).first()
    a.action = "TAMPERED"
    with pytest.raises(ValueError):
        db.commit()
    db.close()


# ---------------- volunteers / fundraisers / announcements / dashboards ----------------
def test_fundraiser_progress_tasks_and_volunteer_permissions(client, H):
    f = client.get(f"{API}/fundraisers", headers=H.coord).json()
    bake = next(x for x in f if x["name"] == "Spring Bake Sale")
    assert bake["amount_raised"] == 215.5 and bake["percent"] == 43.1 and bake["tasks_total"] == 4
    client.post(f"{API}/fundraisers/{bake['id']}/donations", headers=H.coord, json={"amount": 84.5})
    assert next(x for x in client.get(f"{API}/fundraisers", headers=H.coord).json() if x["id"] == bake["id"])["amount_raised"] == 300
    mine = client.get(f"{API}/tasks", headers=H.vol).json()
    assert len(mine) == 2
    t = mine[0]
    assert client.patch(f"{API}/tasks/{t['id']}", headers=H.vol, json={"status": "DONE", "title": "hacked"}).json()["title"] == t["title"]
    unassigned = next(x for x in client.get(f"{API}/tasks", headers=H.coord).json() if not x["assignees"])
    assert client.patch(f"{API}/tasks/{unassigned['id']}", headers=H.vol, json={"status": "DONE"}).status_code == 403
    vols = client.get(f"{API}/volunteers", headers=H.coord).json()
    assert client.post(f"{API}/tasks/{unassigned['id']}/assign", headers=H.coord, json={"volunteer_id": vols[0]["id"]}).json()["assignees"]
    assert client.post(f"{API}/volunteers/join", headers=H.john, json={"skills": "Photography"}).status_code == 201
    assert "VOLUNTEER" in client.get(f"{API}/auth/me", headers=H.john).json()["roles"]


def test_announcements_draft_publish_archive_audience(client, H):
    a = client.post(f"{API}/announcements", headers=H.head, json={"title": "Staff only note", "content": "x", "audience_type": "STAFF"}).json()
    assert a["status"] == "DRAFT"
    assert all(x["title"] != "Staff only note" for x in client.get(f"{API}/announcements", headers=H.john).json())
    client.post(f"{API}/announcements/{a['id']}/publish", headers=H.head)
    assert all(x["title"] != "Staff only note" for x in client.get(f"{API}/announcements", headers=H.john).json())  # audience filter
    assert any(x["title"] == "Staff only note" for x in client.get(f"{API}/announcements", headers=H.events).json())
    assert client.post(f"{API}/announcements/{a['id']}/archive", headers=H.head).json()["status"] == "ARCHIVED"
    assert client.post(f"{API}/announcements", headers=H.john, json={"title": "no", "content": "x"}).status_code == 403


def test_dashboards_are_role_scoped(client, H):
    root = client.get(f"{API}/dashboard", headers=H.root).json()
    assert {"overview", "finance", "events", "inventory", "volunteers"} <= set(root)
    assert set(client.get(f"{API}/dashboard", headers=H.treas).json()) >= {"finance"}
    assert "finance" not in client.get(f"{API}/dashboard", headers=H.events).json()
    assert set(client.get(f"{API}/dashboard", headers=H.john).json()) == {"roles", "member"}


def test_user_role_admin(client, H):
    users = client.get(f"{API}/users", headers=H.root).json()
    john = next(u for u in users if u["email"] == "john.doe@skyline.edu")
    r = client.put(f"{API}/users/{john['id']}/roles", headers=H.head, json={"roles": ["EVENT_MANAGER"]})
    assert r.status_code == 200 and "EVENT_MANAGER" in r.json()["roles"]
    assert client.put(f"{API}/users/{john['id']}/roles", headers=H.head, json={"roles": ["SUPER_ADMIN"]}).status_code == 403
