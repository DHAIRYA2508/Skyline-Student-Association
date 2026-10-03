# Student Organization Management System - Database Documentation

## 1. Overview

This directory contains the production-grade MySQL 8+ database scripts and documentation for the **Student Organization Management System**.

The database architecture is built using:
- **Engine**: MySQL 8.0+ / InnoDB
- **Charset & Collation**: `utf8mb4` / `utf8mb4_unicode_ci`
- **Primary Keys**: 128-bit UUID stored as `BINARY(16)`
- **Monetary Values**: `DECIMAL(12,2)`
- **Timestamps**: `DATETIME` (UTC)
- **Soft Deletes**: `is_deleted`, `deleted_at`, `deleted_by` pattern for core entities
- **Audit Ledger**: Append-only audit logs with JSON snapshots

---

## 2. Directory Structure

```text
database/
├── README.md
├── SCHEMA.md
└── scripts/
    ├── 01_create_database.sql
    ├── 02_create_tables.sql
    ├── 03_create_constraints_indexes.sql
    ├── 04_seed_data.sql
    └── 05_test_queries.sql
```

---

## 3. SQL Script Breakdown

| Script File | Purpose |
|---|---|
| [`01_create_database.sql`](file:///c:/SSA/Skyline-Student-Association/student-organization-system/database/scripts/01_create_database.sql) | Drops and recreates the `student_org_db` database with `utf8mb4` charset. |
| [`02_create_tables.sql`](file:///c:/SSA/Skyline-Student-Association/student-organization-system/database/scripts/02_create_tables.sql) | Creates all 33 database tables in dependency-safe order. |
| [`03_create_constraints_indexes.sql`](file:///c:/SSA/Skyline-Student-Association/student-organization-system/database/scripts/03_create_constraints_indexes.sql) | Adds foreign keys, check constraints, unique constraints, and performance indexes. |
| [`04_seed_data.sql`](file:///c:/SSA/Skyline-Student-Association/student-organization-system/database/scripts/04_seed_data.sql) | Populates realistic development seed data across all 33 tables. |
| [`05_test_queries.sql`](file:///c:/SSA/Skyline-Student-Association/student-organization-system/database/scripts/05_test_queries.sql) | Includes 16 executable queries verifying all modules, revenue, and financial balances. |

---

## 4. Execution Instructions

### Using MySQL Command Line Client:

```bash
mysql -u root -p < database/scripts/01_create_database.sql
mysql -u root -p student_org_db < database/scripts/02_create_tables.sql
mysql -u root -p student_org_db < database/scripts/03_create_constraints_indexes.sql
mysql -u root -p student_org_db < database/scripts/04_seed_data.sql
mysql -u root -p student_org_db < database/scripts/05_test_queries.sql
```

---

## 5. Summary of 33 Core Tables

1. `organizations` - Organization master records & configuration
2. `users` - User authentication & system credentials
3. `roles` - Role definitions (RBAC)
4. `permissions` - System permission codes
5. `role_permissions` - Role-to-permission mapping (Junction)
6. `user_roles` - User-to-role assignment (Junction)
7. `refresh_tokens` - JWT refresh token hashes & device tracking
8. `members` - Student association member profiles
9. `membership_plans` - Subscription tier plans
10. `memberships` - Active and past member subscriptions
11. `membership_payments` - Payment receipts for membership plans
12. `membership_benefits` - Plan benefits & entitlement descriptions
13. `events` - Organization events & workshops
14. `event_tickets` - Issued tickets & QR tokens
15. `event_checkins` - Event entry scanning records
16. `announcements` - Public & member broadcast messages
17. `notifications` - User-specific notification queue
18. `products` - Store merchandise catalog
19. `product_variants` - Product size/color variants & SKUs
20. `inventory` - Variant stock levels & low-stock thresholds
21. `inventory_transactions` - Stock movements (Purchase, Sale, Return)
22. `orders` - Merchandise customer orders
23. `order_items` - Order item snapshots & historical prices
24. `order_payments` - Payment records for merchandise orders
25. `volunteer_profiles` - Volunteer skills & availability profiles
26. `fundraisers` - Fundraising campaigns & financial targets
27. `tasks` - Event & fundraiser task assignments
28. `task_assignments` - Volunteer task delegation
29. `expenses` - Submitted expense reimbursement claims
30. `expense_receipts` - Uploaded receipt attachment metadata
31. `reimbursements` - Processed expense payouts
32. `transactions` - Immutable central financial ledger
33. `audit_logs` - Append-only system audit log
