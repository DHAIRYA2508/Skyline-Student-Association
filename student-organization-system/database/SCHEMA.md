# Student Organization Management System - Comprehensive Schema Documentation

This document provides complete, field-level documentation for all **33 tables** in the MySQL 8+ database for the **Student Organization Management System**.

---

## Table of Contents

1. [organizations](#1-organizations)
2. [users](#2-users)
3. [roles](#3-roles)
4. [permissions](#4-permissions)
5. [role_permissions](#5-role_permissions)
6. [user_roles](#6-user_roles)
7. [refresh_tokens](#7-refresh_tokens)
8. [members](#8-members)
9. [membership_plans](#9-membership_plans)
10. [memberships](#10-memberships)
11. [membership_payments](#11-membership_payments)
12. [membership_benefits](#12-membership_benefits)
13. [events](#13-events)
14. [event_tickets](#14-event_tickets)
15. [event_checkins](#15-event_checkins)
16. [announcements](#16-announcements)
17. [notifications](#17-notifications)
18. [products](#18-products)
19. [product_variants](#19-product_variants)
20. [inventory](#20-inventory)
21. [inventory_transactions](#21-inventory_transactions)
22. [orders](#22-orders)
23. [order_items](#23-order_items)
24. [order_payments](#24-order_payments)
25. [volunteer_profiles](#25-volunteer_profiles)
26. [fundraisers](#26-fundraisers)
27. [tasks](#27-tasks)
28. [task_assignments](#28-task_assignments)
29. [expenses](#29-expenses)
30. [expense_receipts](#30-expense_receipts)
31. [reimbursements](#31-reimbursements)
32. [transactions](#32-transactions)
33. [audit_logs](#33-audit_logs)

---

## 1. organizations

**Purpose**: Stores top-level organization profiles, branding, contact info, and status for multi-tenant isolation.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `name` | VARCHAR | 150 | NO | None | NO | NO | N/A | None | `'Skyline Student Association'` |
| `slug` | VARCHAR | 180 | NO | None | NO | NO | N/A | UNIQUE (`uq_organizations_slug`) | `'skyline-student-association'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Primary student body organization.'` |
| `logo_url` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'https://storage.example.com/logo.png'` |
| `email` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'contact@skyline-sa.org'` |
| `phone` | VARCHAR | 30 | YES | NULL | NO | NO | N/A | None | `'+1-555-019-2831'` |
| `address` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'123 Campus Way, Suite 400'` |
| `academic_year` | VARCHAR | 20 | YES | NULL | NO | NO | N/A | None | `'2026-2027'` |
| `is_active` | BOOLEAN | 1 | NO | `TRUE` | NO | NO | N/A | INDEX (`idx_organizations_active`) | `TRUE` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `is_deleted` | BOOLEAN | 1 | NO | `FALSE` | NO | NO | N/A | None | `FALSE` |
| `deleted_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `deleted_by` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_organizations_deleted_by`) ON DELETE SET NULL | NULL |

### Relationships & Rules
- **Delete Behavior**: Soft deletes handled via `is_deleted` and `deleted_at`.
- **Business Rules**: Organization slug must be URL-safe and unique globally.

---

## 2. users

**Purpose**: System accounts for authentication, administration, and role-based access control.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_users_organization`) ON DELETE RESTRICT, INDEX (`idx_users_org`), UNIQUE (`uq_users_org_email`) | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `email` | VARCHAR | 255 | NO | None | NO | NO | N/A | UNIQUE (`uq_users_org_email`) | `'admin@skyline-sa.org'` |
| `password_hash` | VARCHAR | 255 | NO | None | NO | NO | N/A | None | `'$2b$12$KIXp7z.3mXg9E5Tj...'` |
| `password_algorithm` | VARCHAR | 30 | NO | `'bcrypt'` | NO | NO | N/A | None | `'bcrypt'` |
| `first_name` | VARCHAR | 100 | NO | None | NO | NO | N/A | None | `'Alex'` |
| `last_name` | VARCHAR | 100 | NO | None | NO | NO | N/A | None | `'Administrator'` |
| `phone` | VARCHAR | 30 | YES | NULL | NO | NO | N/A | None | `'+1-555-019-1111'` |
| `avatar_url` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'https://storage.example.com/avatar.jpg'` |
| `is_active` | BOOLEAN | 1 | NO | `TRUE` | NO | NO | N/A | INDEX (`idx_users_active`) | `TRUE` |
| `last_login_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-10-03 14:00:00'` |
| `failed_login_attempts` | INT | 11 | NO | `0` | NO | NO | N/A | None | `0` |
| `locked_until` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `is_deleted` | BOOLEAN | 1 | NO | `FALSE` | NO | NO | N/A | None | `FALSE` |
| `deleted_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `deleted_by` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_users_deleted_by`) ON DELETE SET NULL | NULL |

### Relationships & Rules
- **Business Rules**: Never store plaintext, encrypted, or reversible passwords. User emails must be unique per organization.

---

## 3. roles

**Purpose**: System and custom roles defined per organization.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('33333333-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_roles_organization`) ON DELETE CASCADE, UNIQUE (`uq_roles_org_name`) | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `name` | VARCHAR | 80 | NO | None | NO | NO | N/A | UNIQUE (`uq_roles_org_name`) | `'SUPER_ADMIN'` |
| `description` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'Full system access.'` |
| `is_system_role` | BOOLEAN | 1 | NO | `FALSE` | NO | NO | N/A | None | `TRUE` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |

---

## 4. permissions

**Purpose**: System-wide permission codes mapped to security modules.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('33333333-3333-3333-3333-111111111111')` |
| `code` | VARCHAR | 100 | NO | None | NO | NO | N/A | UNIQUE (`uq_permissions_code`) | `'org:manage'` |
| `module` | VARCHAR | 50 | NO | None | NO | NO | N/A | INDEX (`idx_permissions_module`) | `'Organization'` |
| `description` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'Manage organization configuration'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |

---

## 5. role_permissions

**Purpose**: Many-to-many junction table mapping permissions to roles.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `role_id` | BINARY | 16 | NO | None | YES | YES | `roles.id` | PK, FK (`fk_role_permissions_role`) ON DELETE CASCADE | `UUID_TO_BIN('33333333-1111-1111-1111-111111111111')` |
| `permission_id` | BINARY | 16 | NO | None | YES | YES | `permissions.id` | PK, FK (`fk_role_permissions_permission`) ON DELETE CASCADE | `UUID_TO_BIN('33333333-3333-3333-3333-111111111111')` |

---

## 6. user_roles

**Purpose**: Many-to-many junction table assigning roles to users.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `user_id` | BINARY | 16 | NO | None | YES | YES | `users.id` | PK, FK (`fk_user_roles_user`) ON DELETE CASCADE | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `role_id` | BINARY | 16 | NO | None | YES | YES | `roles.id` | PK, FK (`fk_user_roles_role`) ON DELETE CASCADE | `UUID_TO_BIN('33333333-1111-1111-1111-111111111111')` |

---

## 7. refresh_tokens

**Purpose**: Stores hashed JWT refresh tokens for secure session revocation and rotation.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('33333333-4444-4444-4444-111111111111')` |
| `user_id` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_refresh_tokens_user`) ON DELETE CASCADE, INDEX (`idx_refresh_tokens_user`) | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `token_hash` | CHAR | 64 | NO | None | NO | NO | N/A | UNIQUE (`uq_refresh_tokens_hash`) | `'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'` |
| `family_id` | BINARY | 16 | NO | None | NO | NO | N/A | INDEX (`idx_refresh_tokens_family`) | `UUID_TO_BIN('33333333-4444-4444-4444-222222222222')` |
| `expires_at` | DATETIME | N/A | NO | None | NO | NO | N/A | INDEX (`idx_refresh_tokens_expires`) | `'2026-12-31 23:59:59'` |
| `revoked_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `device_info` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'Firefox on Windows'` |
| `ip_address` | VARCHAR | 45 | YES | NULL | NO | NO | N/A | None | `'127.0.0.1'` |

---

## 8. members

**Purpose**: Stores student association member profiles.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('44444444-4444-4444-4444-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_members_organization`) ON DELETE RESTRICT, INDEX (`idx_members_org`), UNIQUE (`uq_members_org_student`) | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `user_id` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_members_user`) ON DELETE SET NULL, INDEX (`idx_members_user`) | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `student_id` | VARCHAR | 50 | NO | None | NO | NO | N/A | UNIQUE (`uq_members_org_student`), INDEX (`idx_members_student`) | `'S10293847'` |
| `first_name` | VARCHAR | 100 | NO | None | NO | NO | N/A | None | `'Alex'` |
| `last_name` | VARCHAR | 100 | NO | None | NO | NO | N/A | None | `'Administrator'` |
| `email` | VARCHAR | 255 | NO | None | NO | NO | N/A | None | `'admin@skyline-sa.org'` |
| `phone` | VARCHAR | 30 | YES | NULL | NO | NO | N/A | None | `'+1-555-019-1111'` |
| `date_of_birth` | DATE | N/A | YES | NULL | NO | NO | N/A | None | `'2002-05-14'` |
| `join_date` | DATE | N/A | NO | None | NO | NO | N/A | None | `'2026-01-15'` |
| `status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | INDEX (`idx_members_status`) | `'ACTIVE'` |
| `profile_image_url` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'https://storage.example.com/member.jpg'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-15 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-15 00:00:00'` |
| `is_deleted` | BOOLEAN | 1 | NO | `FALSE` | NO | NO | N/A | None | `FALSE` |
| `deleted_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `deleted_by` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_members_deleted_by`) ON DELETE SET NULL | NULL |

---

## 9. membership_plans

**Purpose**: Master list of subscription tiers, pricing, and discount entitlements.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('55555555-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_membership_plans_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `name` | VARCHAR | 100 | NO | None | NO | NO | N/A | None | `'Gold Annual Membership'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Annual membership plan with discounts.'` |
| `price` | DECIMAL | 12,2 | NO | `0.00` | NO | NO | N/A | CHECK (`chk_membership_plans_price`: `price >= 0`) | `25.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `duration_months` | INT | 11 | NO | None | NO | NO | N/A | CHECK (`chk_membership_plans_duration`: `duration_months > 0`) | `12` |
| `event_discount_percentage` | DECIMAL | 5,2 | NO | `0.00` | NO | NO | N/A | None | `20.00` |
| `merchandise_discount_percentage` | DECIMAL | 5,2 | NO | `0.00` | NO | NO | N/A | None | `15.00` |
| `is_active` | BOOLEAN | 1 | NO | `TRUE` | NO | NO | N/A | INDEX (`idx_membership_plans_active`) | `TRUE` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |

---

## 10. memberships

**Purpose**: Active and historical member subscriptions to membership plans.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('55555555-2222-2222-2222-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_memberships_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `member_id` | BINARY | 16 | NO | None | NO | YES | `members.id` | FK (`fk_memberships_member`) ON DELETE RESTRICT, INDEX (`idx_memberships_member`) | `UUID_TO_BIN('44444444-4444-4444-4444-111111111111')` |
| `membership_plan_id` | BINARY | 16 | NO | None | NO | YES | `membership_plans.id` | FK (`fk_memberships_plan`) ON DELETE RESTRICT | `UUID_TO_BIN('55555555-1111-1111-1111-111111111111')` |
| `start_date` | DATE | N/A | NO | None | NO | NO | N/A | CHECK (`chk_memberships_dates`: `end_date > start_date`) | `'2026-01-15'` |
| `end_date` | DATE | N/A | NO | None | NO | NO | N/A | INDEX (`idx_memberships_end_date`), CHECK (`chk_memberships_dates`) | `'2027-01-15'` |
| `status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | INDEX (`idx_memberships_status`) | `'ACTIVE'` |
| `amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_memberships_amount`: `amount >= 0`) | `25.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `payment_status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | None | `'PAID'` |
| `renewed_from_id` | BINARY | 16 | YES | NULL | NO | YES | `memberships.id` | FK (`fk_memberships_renewed_from`) ON DELETE SET NULL | NULL |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-15 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-15 00:00:00'` |

---

## 11. membership_payments

**Purpose**: Financial receipts for membership subscriptions.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('55555555-3333-3333-3333-111111111111')` |
| `membership_id` | BINARY | 16 | NO | None | NO | YES | `memberships.id` | FK (`fk_membership_payments_membership`) ON DELETE RESTRICT, INDEX (`idx_membership_payments_membership`) | `UUID_TO_BIN('55555555-2222-2222-2222-111111111111')` |
| `amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | None | `25.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `payment_method` | VARCHAR | 30 | NO | None | NO | NO | N/A | None | `'CARD'` |
| `payment_reference` | VARCHAR | 150 | YES | NULL | NO | NO | N/A | UNIQUE (`uq_membership_payments_ref`) | `'PAY-MEM-2026-0001'` |
| `status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | INDEX (`idx_membership_payments_status`) | `'PAID'` |
| `paid_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-01-15 10:30:00'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-15 10:30:00'` |

---

## 12. membership_benefits

**Purpose**: Specific benefits assigned to membership plans.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('55555555-4444-4444-4444-111111111111')` |
| `membership_plan_id` | BINARY | 16 | NO | None | NO | YES | `membership_plans.id` | FK (`fk_membership_benefits_plan`) ON DELETE CASCADE | `UUID_TO_BIN('55555555-1111-1111-1111-111111111111')` |
| `benefit_type` | VARCHAR | 50 | NO | None | NO | NO | N/A | None | `'DISCOUNT'` |
| `benefit_value` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'20%'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Discount on gala tickets.'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-01 00:00:00'` |

---

## 13. events

**Purpose**: Stores events, venues, ticket pricing, and capacity limits.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('66666666-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_events_organization`) ON DELETE RESTRICT, INDEX (`idx_events_org`) | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `name` | VARCHAR | 200 | NO | None | NO | NO | N/A | None | `'Annual Leadership Summit'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Keynote sessions and workshops.'` |
| `venue` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'Grand Auditorium'` |
| `start_datetime` | DATETIME | N/A | NO | None | NO | NO | N/A | INDEX (`idx_events_start`), CHECK (`chk_events_dates`: `end_datetime > start_datetime`) | `'2026-11-10 09:00:00'` |
| `end_datetime` | DATETIME | N/A | NO | None | NO | NO | N/A | CHECK (`chk_events_dates`) | `'2026-11-10 17:00:00'` |
| `capacity` | INT | 11 | NO | None | NO | NO | N/A | CHECK (`chk_events_capacity`: `capacity >= 0`) | `200` |
| `member_price` | DECIMAL | 12,2 | NO | `0.00` | NO | NO | N/A | CHECK (`chk_events_prices`) | `10.00` |
| `non_member_price` | DECIMAL | 12,2 | NO | `0.00` | NO | NO | N/A | CHECK (`chk_events_prices`) | `20.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `registration_start` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-10-01 00:00:00'` |
| `registration_end` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-11-09 23:59:59'` |
| `status` | VARCHAR | 30 | NO | `'DRAFT'` | NO | NO | N/A | INDEX (`idx_events_status`) | `'PUBLISHED'` |
| `created_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_events_created_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-15 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-15 00:00:00'` |
| `is_deleted` | BOOLEAN | 1 | NO | `FALSE` | NO | NO | N/A | None | `FALSE` |
| `deleted_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `deleted_by` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_events_deleted_by`) ON DELETE SET NULL | NULL |

---

## 14. event_tickets

**Purpose**: Issued tickets, QR validation tokens, and historical pricing paid for event entry.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('66666666-2222-2222-2222-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_event_tickets_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `event_id` | BINARY | 16 | NO | None | NO | YES | `events.id` | FK (`fk_event_tickets_event`) ON DELETE RESTRICT, INDEX (`idx_event_tickets_event`) | `UUID_TO_BIN('66666666-1111-1111-1111-111111111111')` |
| `member_id` | BINARY | 16 | YES | NULL | NO | YES | `members.id` | FK (`fk_event_tickets_member`) ON DELETE SET NULL, INDEX (`idx_event_tickets_member`) | `UUID_TO_BIN('44444444-4444-4444-4444-111111111111')` |
| `buyer_name` | VARCHAR | 200 | NO | None | NO | NO | N/A | None | `'Alex Administrator'` |
| `buyer_email` | VARCHAR | 255 | NO | None | NO | NO | N/A | None | `'admin@skyline-sa.org'` |
| `ticket_code` | VARCHAR | 100 | NO | None | NO | NO | N/A | UNIQUE (`uq_event_tickets_code`) | `'TCK-2026-SUMMIT-001'` |
| `qr_token` | VARCHAR | 255 | NO | None | NO | NO | N/A | UNIQUE (`uq_event_tickets_qr`) | `'QR-TOKEN-XYZ-999'` |
| `ticket_type` | VARCHAR | 30 | NO | None | NO | NO | N/A | None | `'MEMBER'` |
| `price` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | None | `10.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `payment_status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | None | `'PAID'` |
| `status` | VARCHAR | 30 | NO | `'RESERVED'` | NO | NO | N/A | INDEX (`idx_event_tickets_status`) | `'PAID'` |
| `purchased_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 10:00:00'` |

---

## 15. event_checkins

**Purpose**: Scanned ticket check-ins for attendance verification.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('66666666-3333-3333-3333-111111111111')` |
| `event_id` | BINARY | 16 | NO | None | NO | YES | `events.id` | FK (`fk_event_checkins_event`) ON DELETE RESTRICT, INDEX (`idx_event_checkins_event`) | `UUID_TO_BIN('66666666-1111-1111-1111-111111111111')` |
| `ticket_id` | BINARY | 16 | NO | None | NO | YES | `event_tickets.id` | FK (`fk_event_checkins_ticket`) ON DELETE RESTRICT, UNIQUE (`uq_event_checkins_ticket`) | `UUID_TO_BIN('66666666-2222-2222-2222-111111111111')` |
| `checked_in_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_event_checkins_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `checked_in_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-11-10 08:45:00'` |
| `method` | VARCHAR | 20 | NO | None | NO | NO | N/A | None | `'QR'` |

---

## 16. announcements

**Purpose**: Broadcast announcements and news for targeted audiences.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('77777777-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_announcements_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `title` | VARCHAR | 200 | NO | None | NO | NO | N/A | None | `'Fall Leadership Summit Open'` |
| `content` | TEXT | N/A | NO | None | NO | NO | N/A | None | `'Registration is now open.'` |
| `audience_type` | VARCHAR | 50 | NO | None | NO | NO | N/A | None | `'ALL_MEMBERS'` |
| `status` | VARCHAR | 30 | NO | `'DRAFT'` | NO | NO | N/A | INDEX (`idx_announcements_status`) | `'PUBLISHED'` |
| `created_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_announcements_created_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `published_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-10-01 08:00:00'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 08:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 08:00:00'` |

---

## 17. notifications

**Purpose**: User notification inbox queue.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('77777777-2222-2222-2222-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_notifications_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `user_id` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_notifications_user`) ON DELETE CASCADE, INDEX (`idx_notifications_user`) | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `type` | VARCHAR | 50 | NO | None | NO | NO | N/A | None | `'EVENT_REMINDER'` |
| `title` | VARCHAR | 200 | NO | None | NO | NO | N/A | None | `'Ticket Confirmation'` |
| `message` | TEXT | N/A | NO | None | NO | NO | N/A | None | `'Your ticket has been issued.'` |
| `reference_type` | VARCHAR | 50 | YES | NULL | NO | NO | N/A | None | `'EVENT_TICKET'` |
| `reference_id` | BINARY | 16 | YES | NULL | NO | NO | N/A | None | `UUID_TO_BIN('66666666-2222-2222-2222-111111111111')` |
| `is_read` | BOOLEAN | 1 | NO | `FALSE` | NO | NO | N/A | INDEX (`idx_notifications_read`) | `FALSE` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 10:00:00'` |
| `read_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |

---

## 18. products

**Purpose**: Store merchandise item master catalog.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('88888888-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_products_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `name` | VARCHAR | 150 | NO | None | NO | NO | N/A | None | `'SSA Official Hoodie'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Cotton embroidered hoodie.'` |
| `category` | VARCHAR | 80 | YES | NULL | NO | NO | N/A | None | `'Apparel'` |
| `image_url` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'https://storage.example.com/hoodie.jpg'` |
| `base_price` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | None | `35.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `is_active` | BOOLEAN | 1 | NO | `TRUE` | NO | NO | N/A | INDEX (`idx_products_active`) | `TRUE` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-20 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-20 00:00:00'` |

---

## 19. product_variants

**Purpose**: Product variants (size, color, unique SKU, price).

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('88888888-2222-2222-2222-111111111111')` |
| `product_id` | BINARY | 16 | NO | None | NO | YES | `products.id` | FK (`fk_product_variants_product`) ON DELETE CASCADE | `UUID_TO_BIN('88888888-1111-1111-1111-111111111111')` |
| `sku` | VARCHAR | 100 | NO | None | NO | NO | N/A | UNIQUE (`uq_product_variants_sku`) | `'SSA-HD-NAVY-M'` |
| `size` | VARCHAR | 20 | YES | NULL | NO | NO | N/A | None | `'Medium'` |
| `color` | VARCHAR | 50 | YES | NULL | NO | NO | N/A | None | `'Navy Blue'` |
| `price` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | None | `35.00` |
| `is_active` | BOOLEAN | 1 | NO | `TRUE` | NO | NO | N/A | None | `TRUE` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-20 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-20 00:00:00'` |

---

## 20. inventory

**Purpose**: Real-time stock quantity and low stock alert thresholds per variant.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('88888888-3333-3333-3333-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_inventory_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `product_variant_id` | BINARY | 16 | NO | None | NO | YES | `product_variants.id` | FK (`fk_inventory_variant`) ON DELETE CASCADE, UNIQUE (`uq_inventory_variant`) | `UUID_TO_BIN('88888888-2222-2222-2222-111111111111')` |
| `quantity` | INT | 11 | NO | `0` | NO | NO | N/A | CHECK (`chk_inventory_quantity`: `quantity >= 0`) | `50` |
| `low_stock_threshold` | INT | 11 | NO | `5` | NO | NO | N/A | CHECK (`chk_inventory_threshold`: `low_stock_threshold >= 0`) | `10` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-20 00:00:00'` |

---

## 21. inventory_transactions

**Purpose**: Audit record of stock movements (purchases, sales, returns, adjustments).

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('88888888-4444-4444-4444-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_inventory_transactions_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `product_variant_id` | BINARY | 16 | NO | None | NO | YES | `product_variants.id` | FK (`fk_inventory_transactions_variant`) ON DELETE RESTRICT, INDEX (`idx_inventory_tx_variant`) | `UUID_TO_BIN('88888888-2222-2222-2222-111111111111')` |
| `transaction_type` | VARCHAR | 30 | NO | None | NO | NO | N/A | None | `'PURCHASE'` |
| `quantity` | INT | 11 | NO | None | NO | NO | N/A | None | `50` |
| `reference_type` | VARCHAR | 50 | YES | NULL | NO | NO | N/A | None | `'PO'` |
| `reference_id` | BINARY | 16 | YES | NULL | NO | NO | N/A | None | NULL |
| `reason` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'Initial stock arrival'` |
| `created_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_inventory_transactions_created_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-20 00:00:00'` |

---

## 22. orders

**Purpose**: Customer merchandise orders.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('99999999-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_orders_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `member_id` | BINARY | 16 | YES | NULL | NO | YES | `members.id` | FK (`fk_orders_member`) ON DELETE SET NULL | `UUID_TO_BIN('44444444-4444-4444-4444-111111111111')` |
| `order_number` | VARCHAR | 50 | NO | None | NO | NO | N/A | UNIQUE (`uq_orders_number`) | `'ORD-2026-001'` |
| `subtotal` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_orders_amounts`) | `35.00` |
| `discount_amount` | DECIMAL | 12,2 | NO | `0.00` | NO | NO | N/A | CHECK (`chk_orders_amounts`) | `5.25` |
| `total_amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_orders_amounts`) | `29.75` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | INDEX (`idx_orders_status`) | `'CONFIRMED'` |
| `payment_status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | INDEX (`idx_orders_payment_status`) | `'PAID'` |
| `payment_method` | VARCHAR | 30 | YES | NULL | NO | NO | N/A | None | `'CARD'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-02 14:20:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-02 14:20:00'` |

---

## 23. order_items

**Purpose**: Individual line items inside an order, storing immutable historical snapshots of product name and unit price.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('99999999-2222-2222-2222-111111111111')` |
| `order_id` | BINARY | 16 | NO | None | NO | YES | `orders.id` | FK (`fk_order_items_order`) ON DELETE CASCADE | `UUID_TO_BIN('99999999-1111-1111-1111-111111111111')` |
| `product_variant_id` | BINARY | 16 | NO | None | NO | YES | `product_variants.id` | FK (`fk_order_items_variant`) ON DELETE RESTRICT | `UUID_TO_BIN('88888888-2222-2222-2222-111111111111')` |
| `product_name_snapshot` | VARCHAR | 150 | NO | None | NO | NO | N/A | None | `'SSA Official Hoodie'` |
| `variant_snapshot` | VARCHAR | 255 | YES | NULL | NO | NO | N/A | None | `'Medium / Navy Blue'` |
| `quantity` | INT | 11 | NO | None | NO | NO | N/A | CHECK (`chk_order_items_qty`: `quantity > 0`) | `1` |
| `unit_price` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_order_items_prices`) | `35.00` |
| `discount_amount` | DECIMAL | 12,2 | NO | `0.00` | NO | NO | N/A | None | `5.25` |
| `total_price` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_order_items_prices`) | `29.75` |

---

## 24. order_payments

**Purpose**: Order payment settlement records.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('99999999-3333-3333-3333-111111111111')` |
| `order_id` | BINARY | 16 | NO | None | NO | YES | `orders.id` | FK (`fk_order_payments_order`) ON DELETE RESTRICT | `UUID_TO_BIN('99999999-1111-1111-1111-111111111111')` |
| `amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | None | `29.75` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `payment_method` | VARCHAR | 30 | NO | None | NO | NO | N/A | None | `'CARD'` |
| `payment_reference` | VARCHAR | 150 | YES | NULL | NO | NO | N/A | None | `'PAY-ORD-2026-0001'` |
| `status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | None | `'PAID'` |
| `paid_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-10-02 14:20:00'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-02 14:20:00'` |

---

## 25. volunteer_profiles

**Purpose**: Extends member profiles with volunteer availability and skills.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('aaaaaaaa-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_volunteer_profiles_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `member_id` | BINARY | 16 | NO | None | NO | YES | `members.id` | FK (`fk_volunteer_profiles_member`) ON DELETE CASCADE, UNIQUE (`uq_volunteer_profiles_member`) | `UUID_TO_BIN('44444444-4444-4444-4444-222222222222')` |
| `availability` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Weekends'` |
| `skills` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Logistics, QR Scanning'` |
| `status` | VARCHAR | 30 | NO | `'ACTIVE'` | NO | NO | N/A | None | `'ACTIVE'` |
| `joined_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-02-01 00:00:00'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-02-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-02-01 00:00:00'` |

---

## 26. fundraisers

**Purpose**: Fundraising campaigns and financial target tracking.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('aaaaaaaa-2222-2222-2222-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_fundraisers_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `name` | VARCHAR | 200 | NO | None | NO | NO | N/A | None | `'Campus Food Pantry Fund'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Annual student food security drive.'` |
| `target_amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_fundraisers_target`: `target_amount > 0`) | `5000.00` |
| `amount_raised` | DECIMAL | 12,2 | NO | `0.00` | NO | NO | N/A | CHECK (`chk_fundraisers_raised`: `amount_raised >= 0`) | `1250.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `start_date` | DATE | N/A | NO | None | NO | NO | N/A | None | `'2026-09-01'` |
| `end_date` | DATE | N/A | YES | NULL | NO | NO | N/A | None | `'2026-12-31'` |
| `status` | VARCHAR | 30 | NO | `'PLANNED'` | NO | NO | N/A | None | `'ACTIVE'` |
| `created_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_fundraisers_created_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-09-01 00:00:00'` |

---

## 27. tasks

**Purpose**: Tasks linked to events or fundraisers.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('bbbbbbbb-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_tasks_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `fundraiser_id` | BINARY | 16 | YES | NULL | NO | YES | `fundraisers.id` | FK (`fk_tasks_fundraiser`) ON DELETE SET NULL | `UUID_TO_BIN('aaaaaaaa-2222-2222-2222-111111111111')` |
| `event_id` | BINARY | 16 | YES | NULL | NO | YES | `events.id` | FK (`fk_tasks_event`) ON DELETE SET NULL | NULL |
| `title` | VARCHAR | 200 | NO | None | NO | NO | N/A | None | `'Setup Food Drive Booths'` |
| `description` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | `'Coordinate booth setup.'` |
| `priority` | VARCHAR | 20 | NO | `'MEDIUM'` | NO | NO | N/A | None | `'HIGH'` |
| `status` | VARCHAR | 30 | NO | `'TODO'` | NO | NO | N/A | INDEX (`idx_tasks_status`) | `'IN_PROGRESS'` |
| `due_date` | DATETIME | N/A | YES | NULL | NO | NO | N/A | INDEX (`idx_tasks_due_date`) | `'2026-10-15 17:00:00'` |
| `created_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_tasks_created_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 00:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 00:00:00'` |

---

## 28. task_assignments

**Purpose**: Delegation of tasks to registered volunteers.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('bbbbbbbb-2222-2222-2222-111111111111')` |
| `task_id` | BINARY | 16 | NO | None | NO | YES | `tasks.id` | FK (`fk_task_assignments_task`) ON DELETE CASCADE, UNIQUE (`uq_task_assignments_task_vol`) | `UUID_TO_BIN('bbbbbbbb-1111-1111-1111-111111111111')` |
| `volunteer_id` | BINARY | 16 | NO | None | NO | YES | `volunteer_profiles.id` | FK (`fk_task_assignments_volunteer`) ON DELETE CASCADE, UNIQUE (`uq_task_assignments_task_vol`) | `UUID_TO_BIN('aaaaaaaa-1111-1111-1111-111111111111')` |
| `assigned_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_task_assignments_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `assigned_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 09:00:00'` |
| `completed_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | NULL |

---

## 29. expenses

**Purpose**: Expense reimbursement submissions and approval workflow.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('cccccccc-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_expenses_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `submitted_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_expenses_submitted_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `category` | VARCHAR | 80 | NO | None | NO | NO | N/A | None | `'EVENT_EXPENSE'` |
| `description` | TEXT | N/A | NO | None | NO | NO | N/A | None | `'Audio equipment rental.'` |
| `amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_expenses_amount`: `amount > 0`) | `150.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `expense_date` | DATE | N/A | NO | None | NO | NO | N/A | None | `'2026-10-01'` |
| `status` | VARCHAR | 30 | NO | `'SUBMITTED'` | NO | NO | N/A | INDEX (`idx_expenses_status`) | `'APPROVED'` |
| `reviewed_by` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_expenses_reviewed_by`) ON DELETE SET NULL | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `reviewed_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-10-02 11:00:00'` |
| `rejection_reason` | TEXT | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 10:00:00'` |
| `updated_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-02 11:00:00'` |

---

## 30. expense_receipts

**Purpose**: Uploaded receipt file attachment metadata.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('cccccccc-2222-2222-2222-111111111111')` |
| `expense_id` | BINARY | 16 | NO | None | NO | YES | `expenses.id` | FK (`fk_expense_receipts_expense`) ON DELETE CASCADE | `UUID_TO_BIN('cccccccc-1111-1111-1111-111111111111')` |
| `file_name` | VARCHAR | 255 | NO | None | NO | NO | N/A | None | `'receipt.pdf'` |
| `file_url` | VARCHAR | 1000 | NO | None | NO | NO | N/A | None | `'https://storage.example.com/receipt.pdf'` |
| `mime_type` | VARCHAR | 100 | NO | None | NO | NO | N/A | None | `'application/pdf'` |
| `file_size` | BIGINT | 20 | YES | NULL | NO | NO | N/A | None | `204800` |
| `uploaded_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_expense_receipts_uploaded_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `uploaded_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-01 10:05:00'` |

---

## 31. reimbursements

**Purpose**: Processed expense payout tracking.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('cccccccc-3333-3333-3333-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_reimbursements_organization`) ON DELETE RESTRICT | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `expense_id` | BINARY | 16 | NO | None | NO | YES | `expenses.id` | FK (`fk_reimbursements_expense`) ON DELETE RESTRICT, UNIQUE (`uq_reimbursements_expense`) | `UUID_TO_BIN('cccccccc-1111-1111-1111-111111111111')` |
| `paid_to` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_reimbursements_paid_to`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | None | `150.00` |
| `payment_method` | VARCHAR | 30 | NO | None | NO | NO | N/A | None | `'ONLINE'` |
| `payment_reference` | VARCHAR | 150 | YES | NULL | NO | NO | N/A | None | `'REIMB-2026-0001'` |
| `status` | VARCHAR | 30 | NO | `'PENDING'` | NO | NO | N/A | None | `'PAID'` |
| `paid_at` | DATETIME | N/A | YES | NULL | NO | NO | N/A | None | `'2026-10-02 14:00:00'` |
| `processed_by` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_reimbursements_processed_by`) ON DELETE SET NULL | `UUID_TO_BIN('22222222-2222-2222-2222-222222222222')` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-10-02 14:00:00'` |

---

## 32. transactions

**Purpose**: Central immutable financial ledger recording all incoming revenues and outgoing expenses.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('dddddddd-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | NO | None | NO | YES | `organizations.id` | FK (`fk_transactions_organization`) ON DELETE RESTRICT, INDEX (`idx_transactions_org`) | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `transaction_type` | VARCHAR | 20 | NO | None | NO | NO | N/A | INDEX (`idx_transactions_type`) | `'INCOME'` |
| `category` | VARCHAR | 60 | NO | None | NO | NO | N/A | INDEX (`idx_transactions_category`) | `'MEMBERSHIP_DUES'` |
| `amount` | DECIMAL | 12,2 | NO | None | NO | NO | N/A | CHECK (`chk_transactions_amount`: `amount > 0`) | `25.00` |
| `currency` | CHAR | 3 | NO | `'USD'` | NO | NO | N/A | None | `'USD'` |
| `description` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'Membership fee payment.'` |
| `transaction_date` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | INDEX (`idx_transactions_date`) | `'2026-01-15 10:30:00'` |
| `reference_type` | VARCHAR | 50 | YES | NULL | NO | NO | N/A | None | `'MEMBERSHIP_PAYMENT'` |
| `reference_id` | BINARY | 16 | YES | NULL | NO | NO | N/A | None | `UUID_TO_BIN('55555555-3333-3333-3333-111111111111')` |
| `created_by` | BINARY | 16 | NO | None | NO | YES | `users.id` | FK (`fk_transactions_created_by`) ON DELETE RESTRICT | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | None | `'2026-01-15 10:30:00'` |

---

## 33. audit_logs

**Purpose**: Append-only audit trail capturing system mutations with JSON snapshots.

### Columns

| Column | Data Type | Length/Precision | Nullable | Default | PK | FK | Referenced Table.Column | Constraints / Indexes | Example Value |
|---|---|---|---|---|---|---|---|---|---|
| `id` | BINARY | 16 | NO | None | YES | NO | N/A | Primary Key | `UUID_TO_BIN('eeeeeeee-1111-1111-1111-111111111111')` |
| `organization_id` | BINARY | 16 | YES | NULL | NO | YES | `organizations.id` | FK (`fk_audit_logs_organization`) ON DELETE SET NULL, INDEX (`idx_audit_logs_org`) | `UUID_TO_BIN('11111111-1111-1111-1111-111111111111')` |
| `actor_id` | BINARY | 16 | YES | NULL | NO | YES | `users.id` | FK (`fk_audit_logs_actor`) ON DELETE SET NULL | `UUID_TO_BIN('22222222-2222-2222-2222-111111111111')` |
| `action` | VARCHAR | 50 | NO | None | NO | NO | N/A | INDEX (`idx_audit_logs_action`) | `'CREATE'` |
| `entity_type` | VARCHAR | 100 | NO | None | NO | NO | N/A | INDEX (`idx_audit_logs_entity_type`) | `'EVENT'` |
| `entity_id` | BINARY | 16 | YES | NULL | NO | NO | N/A | INDEX (`idx_audit_logs_entity_id`) | `UUID_TO_BIN('66666666-1111-1111-1111-111111111111')` |
| `old_values` | JSON | N/A | YES | NULL | NO | NO | N/A | None | NULL |
| `new_values` | JSON | N/A | YES | NULL | NO | NO | N/A | None | `'{"name": "Summit", "capacity": 200}'` |
| `ip_address` | VARCHAR | 45 | YES | NULL | NO | NO | N/A | None | `'127.0.0.1'` |
| `user_agent` | VARCHAR | 500 | YES | NULL | NO | NO | N/A | None | `'Mozilla/5.0'` |
| `created_at` | DATETIME | N/A | NO | `CURRENT_TIMESTAMP` | NO | NO | N/A | INDEX (`idx_audit_logs_created`) | `'2026-09-15 00:00:00'` |
