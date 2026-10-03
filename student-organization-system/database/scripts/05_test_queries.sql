-- ============================================================================
-- Student Organization Management System - Validation & Test Queries
-- Engine: MySQL 8.0+
-- Executable queries for testing and verifying all database modules
-- ============================================================================

USE student_org_db;

-- 1. MEMBERS QUERY
-- Select active members with converted string UUIDs and contact info
SELECT 
    BIN_TO_UUID(m.id) AS member_id,
    m.student_id,
    CONCAT(m.first_name, ' ', m.last_name) AS full_name,
    m.email,
    m.status,
    m.join_date
FROM members m
WHERE m.is_deleted = FALSE
ORDER BY m.join_date DESC;

-- 2. MEMBERSHIPS QUERY
-- Active memberships with plan details
SELECT 
    BIN_TO_UUID(ms.id) AS membership_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    p.name AS plan_name,
    ms.start_date,
    ms.end_date,
    ms.status AS membership_status,
    ms.amount,
    ms.payment_status
FROM memberships ms
JOIN members m ON ms.member_id = m.id
JOIN membership_plans p ON ms.membership_plan_id = p.id;

-- 3. MEMBERSHIP REVENUE QUERY
-- Total revenue collected from membership plan subscriptions
SELECT 
    p.name AS plan_name,
    COUNT(mp.id) AS total_payments,
    SUM(mp.amount) AS total_revenue,
    mp.currency
FROM membership_payments mp
JOIN memberships ms ON mp.membership_id = ms.id
JOIN membership_plans p ON ms.membership_plan_id = p.id
WHERE mp.status = 'PAID'
GROUP BY p.name, mp.currency;

-- 4. EVENTS QUERY
-- Upcoming published events with capacity and created user
SELECT 
    BIN_TO_UUID(e.id) AS event_id,
    e.name AS event_name,
    e.venue,
    e.start_datetime,
    e.end_datetime,
    e.capacity,
    e.member_price,
    e.non_member_price,
    e.status,
    CONCAT(u.first_name, ' ', u.last_name) AS organizer_name
FROM events e
JOIN users u ON e.created_by = u.id
WHERE e.is_deleted = FALSE;

-- 5. TICKETS QUERY
-- Purchased event tickets with buyer details
SELECT 
    BIN_TO_UUID(t.id) AS ticket_id,
    e.name AS event_name,
    t.ticket_code,
    t.buyer_name,
    t.buyer_email,
    t.ticket_type,
    t.price,
    t.status AS ticket_status,
    t.purchased_at
FROM event_tickets t
JOIN events e ON t.event_id = e.id;

-- 6. ATTENDANCE QUERY
-- Event checkins with scanning volunteer/user details
SELECT 
    BIN_TO_UUID(c.id) AS checkin_id,
    e.name AS event_name,
    t.ticket_code,
    t.buyer_name,
    c.checked_in_at,
    c.method AS scan_method,
    CONCAT(u.first_name, ' ', u.last_name) AS scanned_by
FROM event_checkins c
JOIN events e ON c.event_id = e.id
JOIN event_tickets t ON c.ticket_id = t.id
JOIN users u ON c.checked_in_by = u.id;

-- 7. MERCHANDISE QUERY
-- Products with variants and active prices
SELECT 
    BIN_TO_UUID(p.id) AS product_id,
    p.name AS product_name,
    v.sku,
    v.size,
    v.color,
    v.price
FROM products p
JOIN product_variants v ON v.product_id = p.id
WHERE p.is_active = TRUE;

-- 8. INVENTORY QUERY
-- Current stock levels and low stock threshold alerts
SELECT 
    p.name AS product_name,
    v.sku,
    v.size,
    v.color,
    i.quantity AS stock_quantity,
    i.low_stock_threshold,
    CASE WHEN i.quantity <= i.low_stock_threshold THEN 'LOW_STOCK' ELSE 'OK' END AS stock_status
FROM inventory i
JOIN product_variants v ON i.product_variant_id = v.id
JOIN products p ON v.product_id = p.id;

-- 9. ORDERS QUERY
-- Customer orders with order items and total amounts
SELECT 
    o.order_number,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    o.subtotal,
    o.discount_amount,
    o.total_amount,
    o.status AS order_status,
    o.payment_status,
    o.created_at
FROM orders o
LEFT JOIN members m ON o.member_id = m.id;

-- 10. VOLUNTEER TASKS QUERY
-- Active volunteer assignments and task progress
SELECT 
    t.title AS task_title,
    t.priority,
    t.status AS task_status,
    t.due_date,
    CONCAT(m.first_name, ' ', m.last_name) AS volunteer_name,
    vp.skills
FROM tasks t
JOIN task_assignments ta ON ta.task_id = t.id
JOIN volunteer_profiles vp ON ta.volunteer_id = vp.id
JOIN members m ON vp.member_id = m.id;

-- 11. FUNDRAISERS QUERY
-- Fundraiser progress towards financial target
SELECT 
    f.name AS fundraiser_name,
    f.target_amount,
    f.amount_raised,
    ROUND((f.amount_raised / f.target_amount) * 100, 2) AS percentage_reached,
    f.status
FROM fundraisers f;

-- 12. EXPENSES QUERY
-- Submitted expenses and approval reviews
SELECT 
    BIN_TO_UUID(ex.id) AS expense_id,
    ex.category,
    ex.description,
    ex.amount,
    ex.expense_date,
    ex.status AS expense_status,
    CONCAT(u.first_name, ' ', u.last_name) AS submitted_by
FROM expenses ex
JOIN users u ON ex.submitted_by = u.id;

-- 13. REIMBURSEMENTS QUERY
-- Processed expense reimbursements
SELECT 
    r.payment_reference,
    r.amount,
    r.payment_method,
    r.status AS reimbursement_status,
    r.paid_at,
    CONCAT(u.first_name, ' ', u.last_name) AS recipient_name
FROM reimbursements r
JOIN users u ON r.paid_to = u.id;

-- 14. TOTAL INCOME QUERY
-- Financial income breakdown
SELECT 
    category,
    SUM(amount) AS total_income
FROM transactions
WHERE transaction_type = 'INCOME'
GROUP BY category;

-- 15. TOTAL EXPENSES QUERY
-- Financial expense breakdown
SELECT 
    category,
    SUM(amount) AS total_expenses
FROM transactions
WHERE transaction_type = 'EXPENSE'
GROUP BY category;

-- 16. CURRENT BALANCE QUERY
-- Central ledger balance calculation (Total Income - Total Expense)
SELECT 
    SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) AS total_expenses,
    (SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END) - 
     SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END)) AS net_balance,
    currency
FROM transactions
GROUP BY currency;
