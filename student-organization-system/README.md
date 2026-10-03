# Student Organization Management System

## 1. Project Overview

The **Student Organization Management System** is a unified web platform built for the Skyline Student Association. It provides complete digital operations for managing members, events, memberships, finance, inventory, tasks, merchandise, and association workflows.

---

## 2. Tech Stack

### Frontend
- **Framework**: ReactJS with TypeScript (Vite)
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Styling**: Custom CSS

### Backend
- **Framework**: Python 3.10+, FastAPI, Uvicorn
- **Validation**: Pydantic v2
- **ORM & Database Client**: SQLAlchemy 2.0, PyMySQL
- **Authentication & Security**: python-jose, bcrypt / Argon2id
- **Testing**: Pytest, HTTPX

### Database
- **Engine**: MySQL 8+ (InnoDB Engine)

### Package Managers
- **Frontend**: `npm`
- **Backend**: `uv`

---

## 3. Architecture & Requirements

- **Architecture Documentation**: [docs/architecture.md](file:///c:/Users/Dhruv%20Rathod/Desktop/Skyline-Student-Association/student-organization-system/docs/architecture.md)
- **Requirements Specification**: [docs/requirements.md](file:///c:/Users/Dhruv%20Rathod/Desktop/Skyline-Student-Association/student-organization-system/docs/requirements.md)
- **API Specification**: [docs/api.md](file:///c:/Users/Dhruv%20Rathod/Desktop/Skyline-Student-Association/student-organization-system/docs/api.md)
- **Development Guidelines**: [docs/development.md](file:///c:/Users/Dhruv%20Rathod/Desktop/Skyline-Student-Association/student-organization-system/docs/development.md)

The system follows a modern decoupled architecture:

- **Frontend**: Single Page Application (SPA) built with React and TypeScript.
- **Backend**: Asynchronous RESTful API built with FastAPI.
- **Database**: Relational storage using MySQL 8+ managed via SQLAlchemy ORM.

```text
[ React Frontend ]  <---> REST API (JSON / JWT) <--->  [ FastAPI Backend ]  <---> SQLAlchemy ORM <---> [ MySQL Database ]
```

---

## 4. Main Modules

- **Members**: User profiles, roles, contact info, and activity history.
- **Memberships**: Tier management, subscription statuses, auto-renewals, and entitlements.
- **Events**: Event scheduling, locations, capacities, and public listings.
- **Tickets**: Ticket generation, pricing, tier discounts, and check-in tracking.
- **Announcements**: Broadcast messages, notifications, and newsletter publishing.
- **Merchandise**: Store catalog, apparel, accessories, and pricing.
- **Inventory**: Stock level tracking, low-stock alerts, and warehouse allocation.
- **Volunteers**: Event shift assignments, sign-ups, and hours tracking.
- **Fundraisers**: Campaign management, donor records, and goal tracking.
- **Tasks**: Committee task assignments, status boards, and deadlines.
- **Expenses**: Receipt submissions, approval workflows, and reimbursements.
- **Finance**: Budgeting, revenue/expense ledgers, and financial reports.

---

## 5. Planned Development Phases

- **Phase 1: Initial Setup & Project Structure** *(Current)* - Baseline folders, configuration, virtual environment, and minimal API/App skeleton.
- **Phase 2: Database Schema & Core Models** - MySQL DDL, SQLAlchemy models, and migration setup.
- **Phase 3: Authentication & Security (RBAC)** - JWT auth, password hashing, and role-based access control.
- **Phase 4: Core Domain Services & APIs** - CRUD endpoints for members, events, finance, inventory, and tasks.
- **Phase 5: Frontend UI & Integration** - Component library, layout, state management, and page views.
- **Phase 6: Testing & Quality Assurance** - Backend Pytest suite, frontend integration tests, and performance polish.

---

## 6. Local Setup Instructions

### Prerequisites
- Node.js (v18+) & `npm`
- Python 3.10+ & `uv`
- MySQL 8+

### Backend Setup
```bash
cd student-organization-system/backend
uv venv .venv
# Activate virtual environment
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend will run at `http://localhost:8000`. Interactive docs are available at `http://localhost:8000/docs`.

### Frontend Setup
```bash
cd student-organization-system/frontend
npm install
npm run dev
```
Frontend dev server will run at `http://localhost:5173`.

---

## 7. Git Workflow

```text
development → testing/finalization → main
```

- All development takes place on the `development` branch.
- Changes are tested and finalized on `development`.
- The `main` branch only receives reviewed, tested, and explicitly approved releases.
