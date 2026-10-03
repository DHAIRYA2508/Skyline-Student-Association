-- ============================================================================
-- Student Organization Management System - Constraints & Indexes
-- Engine: MySQL 8.0+
-- Foreign Keys, Check Constraints, and Indexes
-- ============================================================================

USE student_org_db;

-- ----------------------------------------------------------------------------
-- 1. FOREIGN KEYS
-- ----------------------------------------------------------------------------

-- Organizations
ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Users
ALTER TABLE users
    ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Roles
ALTER TABLE roles
    ADD CONSTRAINT fk_roles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Role Permissions
ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

-- User Roles
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- Refresh Tokens
ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Members
ALTER TABLE members
    ADD CONSTRAINT fk_members_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Membership Plans
ALTER TABLE membership_plans
    ADD CONSTRAINT fk_membership_plans_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

-- Memberships
ALTER TABLE memberships
    ADD CONSTRAINT fk_memberships_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_memberships_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_memberships_plan FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_memberships_renewed_from FOREIGN KEY (renewed_from_id) REFERENCES memberships(id) ON DELETE SET NULL;

-- Membership Payments
ALTER TABLE membership_payments
    ADD CONSTRAINT fk_membership_payments_membership FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE RESTRICT;

-- Membership Benefits
ALTER TABLE membership_benefits
    ADD CONSTRAINT fk_membership_benefits_plan FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE CASCADE;

-- Events
ALTER TABLE events
    ADD CONSTRAINT fk_events_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_events_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Event Tickets
ALTER TABLE event_tickets
    ADD CONSTRAINT fk_event_tickets_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_event_tickets_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_event_tickets_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

-- Event Checkins
ALTER TABLE event_checkins
    ADD CONSTRAINT fk_event_checkins_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_event_checkins_ticket FOREIGN KEY (ticket_id) REFERENCES event_tickets(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_event_checkins_by FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Announcements
ALTER TABLE announcements
    ADD CONSTRAINT fk_announcements_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Notifications
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Products
ALTER TABLE products
    ADD CONSTRAINT fk_products_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

-- Product Variants
ALTER TABLE product_variants
    ADD CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Inventory
ALTER TABLE inventory
    ADD CONSTRAINT fk_inventory_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_inventory_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;

-- Inventory Transactions
ALTER TABLE inventory_transactions
    ADD CONSTRAINT fk_inventory_transactions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_inventory_transactions_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_inventory_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Orders
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_orders_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

-- Order Items
ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

-- Order Payments
ALTER TABLE order_payments
    ADD CONSTRAINT fk_order_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

-- Volunteer Profiles
ALTER TABLE volunteer_profiles
    ADD CONSTRAINT fk_volunteer_profiles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_volunteer_profiles_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

-- Fundraisers
ALTER TABLE fundraisers
    ADD CONSTRAINT fk_fundraisers_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_fundraisers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Tasks
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_tasks_fundraiser FOREIGN KEY (fundraiser_id) REFERENCES fundraisers(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tasks_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Task Assignments
ALTER TABLE task_assignments
    ADD CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_task_assignments_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_task_assignments_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Expenses
ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_expenses_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_expenses_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Expense Receipts
ALTER TABLE expense_receipts
    ADD CONSTRAINT fk_expense_receipts_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_expense_receipts_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Reimbursements
ALTER TABLE reimbursements
    ADD CONSTRAINT fk_reimbursements_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_reimbursements_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_reimbursements_paid_to FOREIGN KEY (paid_to) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_reimbursements_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Transactions
ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Audit Logs
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;


-- ----------------------------------------------------------------------------
-- 2. CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE memberships
    ADD CONSTRAINT chk_memberships_dates CHECK (end_date > start_date),
    ADD CONSTRAINT chk_memberships_amount CHECK (amount >= 0.00);

ALTER TABLE membership_plans
    ADD CONSTRAINT chk_membership_plans_price CHECK (price >= 0.00),
    ADD CONSTRAINT chk_membership_plans_duration CHECK (duration_months > 0);

ALTER TABLE events
    ADD CONSTRAINT chk_events_dates CHECK (end_datetime > start_datetime),
    ADD CONSTRAINT chk_events_capacity CHECK (capacity >= 0),
    ADD CONSTRAINT chk_events_prices CHECK (member_price >= 0.00 AND non_member_price >= 0.00);

ALTER TABLE inventory
    ADD CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0),
    ADD CONSTRAINT chk_inventory_threshold CHECK (low_stock_threshold >= 0);

ALTER TABLE order_items
    ADD CONSTRAINT chk_order_items_qty CHECK (quantity > 0),
    ADD CONSTRAINT chk_order_items_prices CHECK (unit_price >= 0.00 AND total_price >= 0.00);

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_amounts CHECK (subtotal >= 0.00 AND discount_amount >= 0.00 AND total_amount >= 0.00);

ALTER TABLE expenses
    ADD CONSTRAINT chk_expenses_amount CHECK (amount > 0.00);

ALTER TABLE transactions
    ADD CONSTRAINT chk_transactions_amount CHECK (amount > 0.00);

ALTER TABLE fundraisers
    ADD CONSTRAINT chk_fundraisers_target CHECK (target_amount > 0.00),
    ADD CONSTRAINT chk_fundraisers_raised CHECK (amount_raised >= 0.00);


-- ----------------------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------------------

-- Organizations
CREATE INDEX idx_organizations_active ON organizations (is_active);

-- Users
CREATE INDEX idx_users_active ON users (is_active);
CREATE INDEX idx_users_org ON users (organization_id);

-- Permissions
CREATE INDEX idx_permissions_module ON permissions (module);

-- Refresh Tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- Members
CREATE INDEX idx_members_org ON members (organization_id);
CREATE INDEX idx_members_user ON members (user_id);
CREATE INDEX idx_members_student ON members (student_id);
CREATE INDEX idx_members_status ON members (status);

-- Membership Plans
CREATE INDEX idx_membership_plans_active ON membership_plans (is_active);

-- Memberships
CREATE INDEX idx_memberships_member ON memberships (member_id);
CREATE INDEX idx_memberships_end_date ON memberships (end_date);
CREATE INDEX idx_memberships_status ON memberships (status);

-- Membership Payments
CREATE INDEX idx_membership_payments_membership ON membership_payments (membership_id);
CREATE INDEX idx_membership_payments_status ON membership_payments (status);

-- Events
CREATE INDEX idx_events_org ON events (organization_id);
CREATE INDEX idx_events_start ON events (start_datetime);
CREATE INDEX idx_events_status ON events (status);

-- Event Tickets
CREATE INDEX idx_event_tickets_event ON event_tickets (event_id);
CREATE INDEX idx_event_tickets_member ON event_tickets (member_id);
CREATE INDEX idx_event_tickets_status ON event_tickets (status);

-- Event Checkins
CREATE INDEX idx_event_checkins_event ON event_checkins (event_id);

-- Announcements
CREATE INDEX idx_announcements_status ON announcements (status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_read ON notifications (is_read);

-- Products
CREATE INDEX idx_products_active ON products (is_active);

-- Inventory Transactions
CREATE INDEX idx_inventory_tx_variant ON inventory_transactions (product_variant_id);

-- Orders
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);

-- Tasks
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

-- Expenses
CREATE INDEX idx_expenses_status ON expenses (status);

-- Transactions
CREATE INDEX idx_transactions_org ON transactions (organization_id);
CREATE INDEX idx_transactions_type ON transactions (transaction_type);
CREATE INDEX idx_transactions_category ON transactions (category);
CREATE INDEX idx_transactions_date ON transactions (transaction_date);

-- Audit Logs
CREATE INDEX idx_audit_logs_org ON audit_logs (organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);
