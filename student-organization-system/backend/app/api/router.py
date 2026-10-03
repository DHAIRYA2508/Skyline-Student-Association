from fastapi import APIRouter

from app.api.v1 import (announcements, audit, auth, dashboard, events, expenses, finance, fundraisers, inventory,
                        members, memberships, notifications, orders, organizations, products, reimbursements, tasks,
                        tickets, users, volunteers)

api_router = APIRouter()
for module in (auth, organizations, users, members, memberships, events, tickets, announcements, products, inventory,
               orders, volunteers, fundraisers, tasks, expenses, reimbursements, finance, dashboard, audit, notifications):
    api_router.include_router(module.router)
