"""Role / permission catalogue. Seeded into the DB (roles, permissions, role_permissions)."""

PERMISSIONS = {
    "org.manage": ("organization", "Manage organization settings"),
    "users.manage": ("users", "Manage users and role assignments"),
    "members.view": ("members", "View members"),
    "members.manage": ("members", "Create and edit members"),
    "memberships.manage": ("memberships", "Manage plans and memberships"),
    "events.manage": ("events", "Create, edit and publish events"),
    "tickets.manage": ("tickets", "Sell, cancel and refund tickets"),
    "checkin.perform": ("events", "Check attendees in"),
    "announcements.manage": ("announcements", "Create and publish announcements"),
    "products.manage": ("merchandise", "Manage products and variants"),
    "inventory.manage": ("inventory", "Adjust stock levels"),
    "orders.manage": ("orders", "View and manage all orders"),
    "volunteers.manage": ("volunteers", "Manage volunteers"),
    "fundraisers.manage": ("fundraisers", "Manage fundraisers"),
    "tasks.manage": ("tasks", "Create and assign tasks"),
    "expenses.submit": ("expenses", "Submit expenses"),
    "expenses.approve": ("expenses", "Review, approve and reject expenses"),
    "reimbursements.process": ("expenses", "Process reimbursements"),
    "finance.view": ("finance", "View financial reports"),
    "finance.manage": ("finance", "Record and reverse transactions"),
    "audit.view": ("audit", "View audit logs"),
}

ALL = list(PERMISSIONS)

ROLES = {
    "SUPER_ADMIN": ("Full platform access", ALL),
    "ORGANIZATION_HEAD": ("Leads the organization", [p for p in ALL if p != "org.manage"]),
    "TREASURER": ("Owns the books", [
        "members.view", "finance.view", "finance.manage", "expenses.submit",
        "expenses.approve", "reimbursements.process", "memberships.manage"]),
    "EVENT_MANAGER": ("Runs events and the door", [
        "members.view", "events.manage", "tickets.manage", "checkin.perform",
        "announcements.manage", "expenses.submit"]),
    "INVENTORY_MANAGER": ("Runs merchandise and stock", [
        "products.manage", "inventory.manage", "orders.manage", "expenses.submit"]),
    "VOLUNTEER_COORDINATOR": ("Coordinates volunteers", [
        "members.view", "volunteers.manage", "fundraisers.manage", "tasks.manage",
        "expenses.submit"]),
    "VOLUNTEER": ("Helps run the club", ["expenses.submit"]),
    "MEMBER": ("Club member", []),
}

STAFF_ROLES = [r for r in ROLES if r not in ("MEMBER", "VOLUNTEER")]
