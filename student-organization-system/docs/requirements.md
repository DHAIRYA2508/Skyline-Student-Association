# System Requirements Specification (SRS)
## Student Organization & Club Management System

---

## 1. Executive Summary & Domain Scope

The **Student Organization & Club Management System** serves as the digital operational backbone for club operations, court bookings, member relations, retail gear sales, cafeteria/bar POS, event management, and association finances. 

The platform replaces manual spreadsheets, paper receipts, and fragmented messaging with an integrated multi-tier software system.

---

## 2. Core Functional Requirements

### 2.1 Members & Membership Management
- **Tier Structure**:
  - **Gold Tier**: Premium, full access, maximum court discounts, priority bookings.
  - **Silver Tier**: Standard member access, standard court and shop rates.
  - **Junior Tier**: Discounted rate for members under 18 years old.
- **Profile & History Tracking**:
  - Instant staff lookup by name, ID, or phone number.
  - Complete historical log of visits, bookings, shop purchases, and bar tabs.
  - Automatic expiration alerts and renewal reminders.

### 2.2 Facility & Court Booking Engine
- **Slot Allocation Rules**:
  - Booking slots open every 30 minutes; default session duration is 60 minutes.
  - Daily limit: Maximum of 2 court bookings per member per day.
- **Concurrency & Double-Booking Guardrails**:
  - Strict database transaction locks to guarantee two members can **never** double-book the same court at the same time.
- **Dynamic Pricing & Social Play**:
  - Tiered pricing model (Walk-in vs Silver vs Gold/Junior).
  - Special multi-player court mode (e.g., Friday night social play).
  - Flexible cancellation and rescheduling policies.

### 2.3 Inventory & Gear Shop Operations
- **Unified Inventory**:
  - Single real-time inventory pool serving both physical counter purchases and online orders (pickup/delivery).
  - Categories: Rackets, balls, shoes, accessories, and apparel.
- **Stock Management**:
  - Automated low-stock threshold alerts.
  - Real-time stock decrement upon purchase or order placement.

### 2.4 Cafeteria & Bar POS Engine
- **Point of Sale (POS)**:
  - Rapid shift order entry interface for counter staff.
  - Automated member tier discount application at checkout without manual intervention.
  - Support for open tabs (members can add items throughout their visit and settle before leaving).
  - Multi-channel payment acceptance: Cash, Card, UPI, and Online.
- **Table & Shift Tracking**:
  - Active table status tracking.
  - Shift-end register reconciliation and daily sales summaries.

### 2.5 Online Visitor Portal & Lead Capture
- **Public Portal**:
  - Responsive web catalog showing club facilities, membership plans, public schedule, and gear shop.
  - Instant online trial session booking.
- **Lead Pipeline**:
  - Automated capture of online visitor enquiries.
  - Lead status workflow (New -> Contacted -> Quote Sent -> Converted / Member).

### 2.6 Events, Tickets & Volunteers
- **Events & Tickets**:
  - Event registration, tier-based ticket pricing, and QR check-in scanning.
- **Volunteer Management**:
  - Event shift scheduling, volunteer sign-up, and hours tracking.

### 2.7 Tasks, Expenses & Financial Analytics
- **Task Management**:
  - Assignment boards for staff/volunteers with deadlines and status tracking.
- **Expense & Payroll Management**:
  - Receipt uploads, expense approval workflows, employee payroll tracking, and leave management.
- **Executive Owner Dashboard**:
  - Real-time financial summary: total revenue split across Courts, Shop, and Bar.
  - Breakdown by payment method (Cash, Card, UPI, Online).
  - Accounts receivable/payable monitoring and tax reporting summaries.

---

## 3. Non-Functional Requirements

- **Security & Authorization**: Role-Based Access Control (RBAC) supporting Admin, Staff, Member, and Visitor roles. JWT authentication with Argon2id / bcrypt password hashing.
- **Performance**: Sub-200ms API endpoint latency for booking searches and POS operations.
- **Data Integrity**: Acid-compliant transactions in MySQL 8+ (InnoDB engine) for inventory adjustments, tabs, and booking locks.
- **Usability**: Responsive, modern, dark-mode friendly web interface.

---

## 4. Git & Release Policy

- **Active Development Branch**: `development`
- **Release Branch**: `main` (only merged after explicit testing and approval)
- **Deployment Pipeline**: `development → testing / QA → main`
