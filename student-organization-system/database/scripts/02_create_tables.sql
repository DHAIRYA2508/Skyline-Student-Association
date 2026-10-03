-- ============================================================================
-- Student Organization Management System - Table Definitions
-- Engine: MySQL 8.0+ / InnoDB
-- Tables: 33
-- ============================================================================

USE student_org_db;

-- 1. ORGANIZATIONS
CREATE TABLE organizations (
    id BINARY(16) NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT NULL,
    logo_url VARCHAR(500) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    academic_year VARCHAR(20) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME NULL,
    deleted_by BINARY(16) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_organizations_slug UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USERS
CREATE TABLE users (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_algorithm VARCHAR(30) NOT NULL DEFAULT 'bcrypt',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NULL,
    avatar_url VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME NULL,
    deleted_by BINARY(16) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_org_email UNIQUE (organization_id, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ROLES
CREATE TABLE roles (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(255) NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_roles_org_name UNIQUE (organization_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PERMISSIONS
CREATE TABLE permissions (
    id BINARY(16) NOT NULL,
    code VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_permissions_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ROLE_PERMISSIONS
CREATE TABLE role_permissions (
    role_id BINARY(16) NOT NULL,
    permission_id BINARY(16) NOT NULL,
    PRIMARY KEY (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. USER_ROLES
CREATE TABLE user_roles (
    user_id BINARY(16) NOT NULL,
    role_id BINARY(16) NOT NULL,
    PRIMARY KEY (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. REFRESH_TOKENS
CREATE TABLE refresh_tokens (
    id BINARY(16) NOT NULL,
    user_id BINARY(16) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    family_id BINARY(16) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_info VARCHAR(500) NULL,
    ip_address VARCHAR(45) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MEMBERS
CREATE TABLE members (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    user_id BINARY(16) NULL,
    student_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    date_of_birth DATE NULL,
    join_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    profile_image_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME NULL,
    deleted_by BINARY(16) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_members_org_student UNIQUE (organization_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. MEMBERSHIP_PLANS
CREATE TABLE membership_plans (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    duration_months INT NOT NULL,
    event_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    merchandise_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. MEMBERSHIPS
CREATE TABLE memberships (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    member_id BINARY(16) NOT NULL,
    membership_plan_id BINARY(16) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    renewed_from_id BINARY(16) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. MEMBERSHIP_PAYMENTS
CREATE TABLE membership_payments (
    id BINARY(16) NOT NULL,
    membership_id BINARY(16) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(150) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_membership_payments_ref UNIQUE (payment_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. MEMBERSHIP_BENEFITS
CREATE TABLE membership_benefits (
    id BINARY(16) NOT NULL,
    membership_plan_id BINARY(16) NOT NULL,
    benefit_type VARCHAR(50) NOT NULL,
    benefit_value VARCHAR(255) NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. EVENTS
CREATE TABLE events (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    venue VARCHAR(255) NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    capacity INT NOT NULL,
    member_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    non_member_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    registration_start DATETIME NULL,
    registration_end DATETIME NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by BINARY(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME NULL,
    deleted_by BINARY(16) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. EVENT_TICKETS
CREATE TABLE event_tickets (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    event_id BINARY(16) NOT NULL,
    member_id BINARY(16) NULL,
    buyer_name VARCHAR(200) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    ticket_code VARCHAR(100) NOT NULL,
    qr_token VARCHAR(255) NOT NULL,
    ticket_type VARCHAR(30) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    status VARCHAR(30) NOT NULL DEFAULT 'RESERVED',
    purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_event_tickets_code UNIQUE (ticket_code),
    CONSTRAINT uq_event_tickets_qr UNIQUE (qr_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. EVENT_CHECKINS
CREATE TABLE event_checkins (
    id BINARY(16) NOT NULL,
    event_id BINARY(16) NOT NULL,
    ticket_id BINARY(16) NOT NULL,
    checked_in_by BINARY(16) NOT NULL,
    checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_event_checkins_ticket UNIQUE (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. ANNOUNCEMENTS
CREATE TABLE announcements (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    audience_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by BINARY(16) NOT NULL,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. NOTIFICATIONS
CREATE TABLE notifications (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    user_id BINARY(16) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BINARY(16) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. PRODUCTS
CREATE TABLE products (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    category VARCHAR(80) NULL,
    image_url VARCHAR(500) NULL,
    base_price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. PRODUCT_VARIANTS
CREATE TABLE product_variants (
    id BINARY(16) NOT NULL,
    product_id BINARY(16) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    size VARCHAR(20) NULL,
    color VARCHAR(50) NULL,
    price DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_product_variants_sku UNIQUE (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. INVENTORY
CREATE TABLE inventory (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    product_variant_id BINARY(16) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_inventory_variant UNIQUE (product_variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. INVENTORY_TRANSACTIONS
CREATE TABLE inventory_transactions (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    product_variant_id BINARY(16) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    quantity INT NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BINARY(16) NULL,
    reason VARCHAR(255) NULL,
    created_by BINARY(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. ORDERS
CREATE TABLE orders (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    member_id BINARY(16) NULL,
    order_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_orders_number UNIQUE (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. ORDER_ITEMS
CREATE TABLE order_items (
    id BINARY(16) NOT NULL,
    order_id BINARY(16) NOT NULL,
    product_variant_id BINARY(16) NOT NULL,
    product_name_snapshot VARCHAR(150) NOT NULL,
    variant_snapshot VARCHAR(255) NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. ORDER_PAYMENTS
CREATE TABLE order_payments (
    id BINARY(16) NOT NULL,
    order_id BINARY(16) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(150) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. VOLUNTEER_PROFILES
CREATE TABLE volunteer_profiles (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    member_id BINARY(16) NOT NULL,
    availability TEXT NULL,
    skills TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_volunteer_profiles_member UNIQUE (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. FUNDRAISERS
CREATE TABLE fundraisers (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    amount_raised DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    created_by BINARY(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. TASKS
CREATE TABLE tasks (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    fundraiser_id BINARY(16) NULL,
    event_id BINARY(16) NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'TODO',
    due_date DATETIME NULL,
    created_by BINARY(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. TASK_ASSIGNMENTS
CREATE TABLE task_assignments (
    id BINARY(16) NOT NULL,
    task_id BINARY(16) NOT NULL,
    volunteer_id BINARY(16) NOT NULL,
    assigned_by BINARY(16) NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_task_assignments_task_vol UNIQUE (task_id, volunteer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. EXPENSES
CREATE TABLE expenses (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    submitted_by BINARY(16) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    expense_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by BINARY(16) NULL,
    reviewed_at DATETIME NULL,
    rejection_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. EXPENSE_RECEIPTS
CREATE TABLE expense_receipts (
    id BINARY(16) NOT NULL,
    expense_id BINARY(16) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NULL,
    uploaded_by BINARY(16) NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 31. REIMBURSEMENTS
CREATE TABLE reimbursements (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    expense_id BINARY(16) NOT NULL,
    paid_to BINARY(16) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(150) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    processed_by BINARY(16) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_reimbursements_expense UNIQUE (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 32. TRANSACTIONS
CREATE TABLE transactions (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    category VARCHAR(60) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    description VARCHAR(500) NULL,
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_type VARCHAR(50) NULL,
    reference_id BINARY(16) NULL,
    created_by BINARY(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 33. AUDIT_LOGS
CREATE TABLE audit_logs (
    id BINARY(16) NOT NULL,
    organization_id BINARY(16) NULL,
    actor_id BINARY(16) NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BINARY(16) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
