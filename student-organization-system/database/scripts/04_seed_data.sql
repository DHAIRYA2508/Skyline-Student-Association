-- ============================================================================
-- Student Organization Management System - Seed Data
-- Engine: MySQL 8.0+
-- Realistic development seed data for all major modules
-- ============================================================================

USE student_org_db;

-- 1. ORGANIZATIONS
INSERT INTO organizations (id, name, slug, description, email, phone, is_active)
VALUES (
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'Skyline Student Association',
    'skyline-student-association',
    'Primary student body organization representing all students at Skyline Campus.',
    'contact@skyline-sa.org',
    '+1-555-019-2831',
    TRUE
);

-- 2. USERS
INSERT INTO users (id, organization_id, email, password_hash, password_algorithm, first_name, last_name, is_active)
VALUES 
(
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'admin@skyline-sa.org',
    '$2b$12$KIXp7z.3mXg9E5Tj9B8c.eYd5F7kL8mP9N0O1P2Q3R4S5T6U7V8W9',
    'bcrypt',
    'Alex',
    'Administrator',
    TRUE
),
(
    UUID_TO_BIN('22222222-2222-2222-2222-222222222222'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'treasurer@skyline-sa.org',
    '$2b$12$KIXp7z.3mXg9E5Tj9B8c.eYd5F7kL8mP9N0O1P2Q3R4S5T6U7V8W9',
    'bcrypt',
    'Jordan',
    'Treasurer',
    TRUE
);

-- 3. ROLES
INSERT INTO roles (id, organization_id, name, description, is_system_role)
VALUES 
(
    UUID_TO_BIN('33333333-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'SUPER_ADMIN',
    'Full administrative control across all organization modules.',
    TRUE
),
(
    UUID_TO_BIN('33333333-2222-2222-2222-222222222222'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'TREASURER',
    'Manages financial ledgers, reimbursements, and budgets.',
    TRUE
);

-- 4. PERMISSIONS
INSERT INTO permissions (id, code, module, description)
VALUES 
(
    UUID_TO_BIN('33333333-3333-3333-3333-111111111111'),
    'org:manage',
    'Organization',
    'Permission to modify organization details'
),
(
    UUID_TO_BIN('33333333-3333-3333-3333-222222222222'),
    'finance:manage',
    'Finance',
    'Permission to manage budgets and transactions'
);

-- 5. ROLE_PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id)
VALUES 
(UUID_TO_BIN('33333333-1111-1111-1111-111111111111'), UUID_TO_BIN('33333333-3333-3333-3333-111111111111')),
(UUID_TO_BIN('33333333-2222-2222-2222-222222222222'), UUID_TO_BIN('33333333-3333-3333-3333-222222222222'));

-- 6. USER_ROLES
INSERT INTO user_roles (user_id, role_id)
VALUES 
(UUID_TO_BIN('22222222-2222-2222-2222-111111111111'), UUID_TO_BIN('33333333-1111-1111-1111-111111111111')),
(UUID_TO_BIN('22222222-2222-2222-2222-222222222222'), UUID_TO_BIN('33333333-2222-2222-2222-222222222222'));

-- 7. REFRESH_TOKENS
INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, device_info, ip_address)
VALUES (
    UUID_TO_BIN('33333333-4444-4444-4444-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    UUID_TO_BIN('33333333-4444-4444-4444-222222222222'),
    '2026-12-31 23:59:59',
    'Firefox on Windows 11',
    '127.0.0.1'
);

-- 8. MEMBERS
INSERT INTO members (id, organization_id, user_id, student_id, first_name, last_name, email, phone, join_date, status)
VALUES 
(
    UUID_TO_BIN('44444444-4444-4444-4444-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    'S10293847',
    'Alex',
    'Administrator',
    'admin@skyline-sa.org',
    '+1-555-019-1111',
    '2026-01-15',
    'ACTIVE'
),
(
    UUID_TO_BIN('44444444-4444-4444-4444-222222222222'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    NULL,
    'S10293848',
    'Taylor',
    'Smith',
    'taylor.smith@skyline.edu',
    '+1-555-019-2222',
    '2026-02-01',
    'ACTIVE'
);

-- 9. MEMBERSHIP_PLANS
INSERT INTO membership_plans (id, organization_id, name, description, price, currency, duration_months, event_discount_percentage, merchandise_discount_percentage, is_active)
VALUES (
    UUID_TO_BIN('55555555-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'Gold Annual Membership',
    'Full annual membership access with priority event seating and 15% merch discount.',
    25.00,
    'USD',
    12,
    20.00,
    15.00,
    TRUE
);

-- 10. MEMBERSHIPS
INSERT INTO memberships (id, organization_id, member_id, membership_plan_id, start_date, end_date, status, amount, currency, payment_status)
VALUES (
    UUID_TO_BIN('55555555-2222-2222-2222-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('44444444-4444-4444-4444-111111111111'),
    UUID_TO_BIN('55555555-1111-1111-1111-111111111111'),
    '2026-01-15',
    '2027-01-15',
    'ACTIVE',
    25.00,
    'USD',
    'PAID'
);

-- 11. MEMBERSHIP_PAYMENTS
INSERT INTO membership_payments (id, membership_id, amount, currency, payment_method, payment_reference, status, paid_at)
VALUES (
    UUID_TO_BIN('55555555-3333-3333-3333-111111111111'),
    UUID_TO_BIN('55555555-2222-2222-2222-111111111111'),
    25.00,
    'USD',
    'CARD',
    'PAY-MEM-2026-0001',
    'PAID',
    '2026-01-15 10:30:00'
);

-- 12. MEMBERSHIP_BENEFITS
INSERT INTO membership_benefits (id, membership_plan_id, benefit_type, benefit_value, description)
VALUES (
    UUID_TO_BIN('55555555-4444-4444-4444-111111111111'),
    UUID_TO_BIN('55555555-1111-1111-1111-111111111111'),
    'DISCOUNT',
    '20%',
    'Discount on all official SSA annual galas and workshops.'
);

-- 13. EVENTS
INSERT INTO events (id, organization_id, name, description, venue, start_datetime, end_datetime, capacity, member_price, non_member_price, currency, status, created_by)
VALUES (
    UUID_TO_BIN('66666666-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'Annual Student Leadership Summit',
    'Keynote sessions, workshops, and networking for student leaders.',
    'Grand Auditorium, Student Center',
    '2026-11-10 09:00:00',
    '2026-11-10 17:00:00',
    200,
    10.00,
    20.00,
    'USD',
    'PUBLISHED',
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
);

-- 14. EVENT_TICKETS
INSERT INTO event_tickets (id, organization_id, event_id, member_id, buyer_name, buyer_email, ticket_code, qr_token, ticket_type, price, currency, payment_status, status)
VALUES (
    UUID_TO_BIN('66666666-2222-2222-2222-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('66666666-1111-1111-1111-111111111111'),
    UUID_TO_BIN('44444444-4444-4444-4444-111111111111'),
    'Alex Administrator',
    'admin@skyline-sa.org',
    'TCK-2026-SUMMIT-001',
    'QR-TOKEN-XYZ-999-ABC',
    'MEMBER',
    10.00,
    'USD',
    'PAID',
    'PAID'
);

-- 15. EVENT_CHECKINS
INSERT INTO event_checkins (id, event_id, ticket_id, checked_in_by, checked_in_at, method)
VALUES (
    UUID_TO_BIN('66666666-3333-3333-3333-111111111111'),
    UUID_TO_BIN('66666666-1111-1111-1111-111111111111'),
    UUID_TO_BIN('66666666-2222-2222-2222-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    '2026-11-10 08:45:00',
    'QR'
);

-- 16. ANNOUNCEMENTS
INSERT INTO announcements (id, organization_id, title, content, audience_type, status, created_by, published_at)
VALUES (
    UUID_TO_BIN('77777777-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'Fall Leadership Summit Registration Open',
    'Registration for the annual student leadership summit is now open to all members.',
    'ALL_MEMBERS',
    'PUBLISHED',
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    '2026-10-01 08:00:00'
);

-- 17. NOTIFICATIONS
INSERT INTO notifications (id, organization_id, user_id, type, title, message, is_read)
VALUES (
    UUID_TO_BIN('77777777-2222-2222-2222-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    'EVENT_REMINDER',
    'Summit Ticket Confirmation',
    'Your ticket for the Annual Leadership Summit has been issued successfully.',
    FALSE
);

-- 18. PRODUCTS
INSERT INTO products (id, organization_id, name, description, category, base_price, currency, is_active)
VALUES (
    UUID_TO_BIN('88888888-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'SSA Official Hoodie',
    'Embroidered heavy cotton hoodie with official skyline crest.',
    'Apparel',
    35.00,
    'USD',
    TRUE
);

-- 19. PRODUCT_VARIANTS
INSERT INTO product_variants (id, product_id, sku, size, color, price, is_active)
VALUES (
    UUID_TO_BIN('88888888-2222-2222-2222-111111111111'),
    UUID_TO_BIN('88888888-1111-1111-1111-111111111111'),
    'SSA-HD-NAVY-M',
    'Medium',
    'Navy Blue',
    35.00,
    TRUE
);

-- 20. INVENTORY
INSERT INTO inventory (id, organization_id, product_variant_id, quantity, low_stock_threshold)
VALUES (
    UUID_TO_BIN('88888888-3333-3333-3333-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('88888888-2222-2222-2222-111111111111'),
    50,
    10
);

-- 21. INVENTORY_TRANSACTIONS
INSERT INTO inventory_transactions (id, organization_id, product_variant_id, transaction_type, quantity, reason, created_by)
VALUES (
    UUID_TO_BIN('88888888-4444-4444-4444-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('88888888-2222-2222-2222-111111111111'),
    'PURCHASE',
    50,
    'Initial stock replenishment',
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
);

-- 22. ORDERS
INSERT INTO orders (id, organization_id, member_id, order_number, subtotal, discount_amount, total_amount, currency, status, payment_status, payment_method)
VALUES (
    UUID_TO_BIN('99999999-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('44444444-4444-4444-4444-111111111111'),
    'ORD-2026-001',
    35.00,
    5.25,
    29.75,
    'USD',
    'CONFIRMED',
    'PAID',
    'CARD'
);

-- 23. ORDER_ITEMS
INSERT INTO order_items (id, order_id, product_variant_id, product_name_snapshot, variant_snapshot, quantity, unit_price, discount_amount, total_price)
VALUES (
    UUID_TO_BIN('99999999-2222-2222-2222-111111111111'),
    UUID_TO_BIN('99999999-1111-1111-1111-111111111111'),
    UUID_TO_BIN('88888888-2222-2222-2222-111111111111'),
    'SSA Official Hoodie',
    'Size: Medium, Color: Navy Blue',
    1,
    35.00,
    5.25,
    29.75
);

-- 24. ORDER_PAYMENTS
INSERT INTO order_payments (id, order_id, amount, currency, payment_method, payment_reference, status, paid_at)
VALUES (
    UUID_TO_BIN('99999999-3333-3333-3333-111111111111'),
    UUID_TO_BIN('99999999-1111-1111-1111-111111111111'),
    29.75,
    'USD',
    'CARD',
    'PAY-ORD-2026-0001',
    'PAID',
    '2026-10-02 14:20:00'
);

-- 25. VOLUNTEER_PROFILES
INSERT INTO volunteer_profiles (id, organization_id, member_id, availability, skills, status)
VALUES (
    UUID_TO_BIN('aaaaaaaa-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('44444444-4444-4444-4444-222222222222'),
    'Weekends & Friday afternoons',
    'Event Logistics, Check-in Scanning, Graphic Design',
    'ACTIVE'
);

-- 26. FUNDRAISERS
INSERT INTO fundraisers (id, organization_id, name, description, target_amount, amount_raised, currency, start_date, status, created_by)
VALUES (
    UUID_TO_BIN('aaaaaaaa-2222-2222-2222-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'Campus Food Pantry Fund 2026',
    'Annual fundraising initiative to support student food security.',
    5000.00,
    1250.00,
    'USD',
    '2026-09-01',
    'ACTIVE',
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
);

-- 27. TASKS
INSERT INTO tasks (id, organization_id, fundraiser_id, event_id, title, description, priority, status, due_date, created_by)
VALUES (
    UUID_TO_BIN('bbbbbbbb-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('aaaaaaaa-2222-2222-2222-111111111111'),
    NULL,
    'Setup Food Drive Collection Booths',
    'Coordinate booth placement across student union hall.',
    'HIGH',
    'IN_PROGRESS',
    '2026-10-15 17:00:00',
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
);

-- 28. TASK_ASSIGNMENTS
INSERT INTO task_assignments (id, task_id, volunteer_id, assigned_by)
VALUES (
    UUID_TO_BIN('bbbbbbbb-2222-2222-2222-111111111111'),
    UUID_TO_BIN('bbbbbbbb-1111-1111-1111-111111111111'),
    UUID_TO_BIN('aaaaaaaa-1111-1111-1111-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
);

-- 29. EXPENSES
INSERT INTO expenses (id, organization_id, submitted_by, category, description, amount, currency, expense_date, status, reviewed_by, reviewed_at)
VALUES (
    UUID_TO_BIN('cccccccc-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    'EVENT_EXPENSE',
    'Audio equipment rental for Leadership Summit',
    150.00,
    'USD',
    '2026-10-01',
    'APPROVED',
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    '2026-10-02 11:00:00'
);

-- 30. EXPENSE_RECEIPTS
INSERT INTO expense_receipts (id, expense_id, file_name, file_url, mime_type, file_size, uploaded_by)
VALUES (
    UUID_TO_BIN('cccccccc-2222-2222-2222-111111111111'),
    UUID_TO_BIN('cccccccc-1111-1111-1111-111111111111'),
    'audio_rental_receipt.pdf',
    'https://storage.skyline-sa.org/receipts/2026/audio_rental_receipt.pdf',
    'application/pdf',
    204800,
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
);

-- 31. REIMBURSEMENTS
INSERT INTO reimbursements (id, organization_id, expense_id, paid_to, amount, payment_method, payment_reference, status, paid_at, processed_by)
VALUES (
    UUID_TO_BIN('cccccccc-3333-3333-3333-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('cccccccc-1111-1111-1111-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    150.00,
    'ONLINE',
    'REIMB-2026-0001',
    'PAID',
    '2026-10-02 14:00:00',
    UUID_TO_BIN('22222222-2222-2222-2222-222222222222')
);

-- 32. TRANSACTIONS
INSERT INTO transactions (id, organization_id, transaction_type, category, amount, currency, description, reference_type, reference_id, created_by)
VALUES 
(
    UUID_TO_BIN('dddddddd-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'INCOME',
    'MEMBERSHIP_DUES',
    25.00,
    'USD',
    'Annual membership fee payment for Alex Administrator',
    'MEMBERSHIP_PAYMENT',
    UUID_TO_BIN('55555555-3333-3333-3333-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111')
),
(
    UUID_TO_BIN('dddddddd-2222-2222-2222-222222222222'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    'EXPENSE',
    'EVENT_EXPENSE',
    150.00,
    'USD',
    'Audio equipment rental reimbursement',
    'REIMBURSEMENT',
    UUID_TO_BIN('cccccccc-3333-3333-3333-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-222222222222')
);

-- 33. AUDIT_LOGS
INSERT INTO audit_logs (id, organization_id, actor_id, action, entity_type, entity_id, new_values, ip_address)
VALUES (
    UUID_TO_BIN('eeeeeeee-1111-1111-1111-111111111111'),
    UUID_TO_BIN('11111111-1111-1111-1111-111111111111'),
    UUID_TO_BIN('22222222-2222-2222-2222-111111111111'),
    'CREATE',
    'EVENT',
    UUID_TO_BIN('66666666-1111-1111-1111-111111111111'),
    '{"name": "Annual Student Leadership Summit", "capacity": 200}',
    '127.0.0.1'
);
