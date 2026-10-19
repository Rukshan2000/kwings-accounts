# Project: Kwings Accounting — Simple Financial Management System

You are a senior full-stack software engineer.

Build a clean, modern, production-ready accounting management web application for Kwings Media.

**Application Name:** Kwings Accounts  
**Production Domain:** accounts.kwingsmedia.com

The main objective is to manage business income, expenses, financial accounts, profitability, and return on investment (ROI).

Keep the application SIMPLE, FAST, SECURE, and EASY TO USE.

Do not implement unnecessary enterprise accounting features.

---

## 1. Technology Stack

Use the following technologies:

**Frontend**
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Responsive UI
- Lucide Icons

**Backend**
- Node.js
- Express.js
- TypeScript
- REST API
- Zod validation

**Database**
- PostgreSQL 16
- Knex.js query builder
- Knex migrations
- Knex seeds

**Authentication**
- JWT authentication
- Secure HTTP-only cookies
- bcrypt password hashing

**Infrastructure**
- Docker
- Docker Compose
- Nginx reverse proxy
- GitHub Actions CI/CD
- GitHub Container Registry (GHCR)

Use npm workspaces for the monorepo.

Do not use Prisma, Sequelize, Firebase, or Supabase.

---

## 2. MVP Features

### 2.1 Authentication

Implement simple authentication.

Features:
- Admin login
- Logout
- Change password
- Protected routes
- Secure session handling

Only one administrator is required for the MVP.

Create the initial administrator using environment variables or a secure setup command.

No public registration.

### 2.2 Dashboard

Create a financial overview dashboard.

Display:

- Total Income
- Total Expenses
- Net Profit / Loss
- Total Account Balances
- Total Investment
- ROI Percentage
- Monthly Income
- Monthly Expenses

Include:
- Income vs Expenses chart
- Monthly Profit chart
- Recent Transactions
- Date range filter

Use simple, readable charts.

Dashboard values must be calculated from actual database records.

### 2.3 Financial Accounts

Allow managing multiple financial accounts.

Examples:
- Cash
- Business Bank Account
- Personal Bank Account
- Digital Wallet

Features:
- Create account
- Edit account
- Archive account
- Opening balance
- Current balance
- Account transaction history
- Transfer money between accounts

Account balance calculation:

Current Balance = Opening Balance + Income - Expenses + Incoming Transfers - Outgoing Transfers

Transfers must not affect total income, expenses, or profit.

Prevent accidental deletion of accounts containing transactions.

### 2.4 Income Management

Features:
- Add income
- Edit income
- Delete income
- Income category
- Amount
- Date
- Description
- Received account
- Optional project reference
- Income transaction history
- Search and filters

Example categories:
- Website Development
- Software Development
- Maintenance
- Hosting
- Consulting
- Other Income

Allow managing categories.

### 2.5 Expense Management

Features:
- Add expense
- Edit expense
- Delete expense
- Expense category
- Amount
- Date
- Description
- Paid account
- Optional project reference
- Expense transaction history
- Search and filters

Example categories:
- Hosting
- Domains
- Software Subscriptions
- Marketing
- Salaries
- Office Expenses
- Transport
- Other Expenses

Allow managing categories.

### 2.6 Project Financial Tracking

Create simple project management for financial tracking.

Each project contains:
- Project name
- Client name (plain text)
- Description
- Start date
- Status (Active, Completed, Cancelled)

Allow linking income and expenses to projects.

Display:
- Project Income
- Project Expenses
- Project Profit / Loss
- Project ROI

Formula:

Project Profit = Project Income - Project Expenses

Project ROI = (Project Profit / Project Expenses) × 100

If expenses are zero, display ROI as N/A.

Do not build advanced project management features.

### 2.7 Investment and ROI Tracking

Allow recording investments separately from income and expenses.

Fields:
- Investment name
- Amount
- Date
- Description
- Optional project reference
- Funding account

Investments represent money committed to a project or business activity.

Show:
- Total Investment
- Investment List
- Project Investment
- ROI Percentage

ROI formula:

ROI = (Net Return / Investment Cost) × 100

For investment-based ROI, use:

Net Return = Linked Income - Linked Expenses - Investment Cost

Avoid counting investment cost twice.

Clearly distinguish:
- Operational profit
- Investment-based ROI

An investment is a capital allocation, not automatically an operating expense.

Deduct funded investments from the relevant account balance, but do not deduct them from operational profit unless separately recorded as an expense.

Do not implement complex investment portfolio management.

---

## 3. Reports

Implement only these reports:

1. Income Report
2. Expense Report
3. Profit & Loss Report
4. Account Balance Report
5. Project Profitability Report

Features:
- Date range filtering
- Category filtering where applicable
- Project filtering
- CSV export

No PDF generation required for MVP.

---

## 4. Database Architecture

Use PostgreSQL with Knex migrations.

Create the following tables:

### users
- id
- name
- email
- password_hash
- created_at
- updated_at

### accounts
- id
- name
- type
- opening_balance
- is_active
- created_at
- updated_at

### categories
- id
- name
- type (income / expense)
- created_at
- updated_at

### projects
- id
- name
- client_name
- description
- status
- start_date
- created_at
- updated_at

### transactions
- id
- account_id
- category_id
- project_id (nullable)
- type (income / expense)
- amount
- description
- transaction_date
- created_at
- updated_at

### transfers
- id
- from_account_id
- to_account_id
- amount
- description
- transfer_date
- created_at

### investments
- id
- account_id
- project_id (nullable)
- name
- amount
- description
- investment_date
- created_at
- updated_at

Use:
- UUID primary keys
- Foreign keys
- Proper indexes
- NOT NULL constraints
- Appropriate database constraints
- Numeric(18,2) for monetary amounts
- UTC timestamps

Default currency: LKR.

Only LKR is required for MVP.

Never use JavaScript floating-point arithmetic for financial calculations. Use PostgreSQL NUMERIC and a decimal-safe calculation library where necessary.

Use database transactions for financial operations involving multiple records.

Ensure:
- No negative transaction amounts
- No transfers to the same account
- No duplicate transfers caused by repeated requests
- Account balances are calculated consistently
- Financial calculations use a single shared backend service
- Date filters use transaction dates, not creation dates
- Editing or deleting records updates calculated balances correctly

Keep the database normalized.

Do not introduce unnecessary tables.

---

## 5. UI / UX Requirements

Build a premium but minimal financial dashboard.

Design style:
- Professional SaaS dashboard
- White / light gray background
- Dark navy sidebar
- Blue primary actions
- Green for income
- Red for expenses
- Clean typography
- Minimal animations
- Mobile responsive

Pages:

1. Login
2. Dashboard
3. Accounts
4. Transactions
5. Projects
6. Investments
7. Reports
8. Settings

Transactions page should support both income and expenses.

Use:
- Sidebar navigation
- Summary cards
- Data tables
- Simple charts
- Search
- Filters
- Modal forms
- Confirmation dialogs
- Toast notifications
- Loading states
- Empty states

Prioritize usability over visual complexity.

Do not add unnecessary animations or decorative components.

---

## 6. Backend Architecture

Use a simple layered architecture.

Suggested structure:

```text
kwings-accounts/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── Dockerfile
│   │
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── middleware/
│       │   ├── validators/
│       │   └── server.ts
│       └── Dockerfile
│
├── packages/
│   └── db/
│       ├── migrations/
│       ├── seeds/
│       ├── knexfile.ts
│       └── scripts/
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .env.example
├── package.json
└── README.md
```

Use straightforward REST APIs.

API routes:

```text
/api/auth/*
/api/dashboard
/api/accounts/*
/api/categories/*
/api/transactions/*
/api/transfers/*
/api/projects/*
/api/investments/*
/api/reports/*
/api/health
```

Implement:
- Request validation
- Authentication middleware
- Centralized error handling
- Structured logging
- Pagination
- Filtering
- Database connection pooling

Do not introduce microservices, Redis, Kafka, queues, GraphQL, or WebSockets.

---

## 7. Docker Requirements

The entire application must run using Docker Compose.

Services:
- PostgreSQL
- Node.js API
- Next.js frontend

Production requirements:
- PostgreSQL persistent volume
- Restart policies
- Health checks
- Environment-based configuration
- Internal Docker network
- Multi-stage Docker builds
- Small production images

PostgreSQL must not be exposed publicly.

API and frontend should communicate through the internal Docker network where appropriate.

Expose the application only through Nginx.

The application should work locally using:

```bash
docker compose up -d --build
```

---

## 8. Nginx Configuration

Production domain:

accounts.kwingsmedia.com

The application will run on an existing Linux VPS with Nginx installed on the host.

Create an Nginx configuration that:

- Proxies `/` to the Next.js frontend
- Proxies `/api/` to the Node.js backend
- Supports HTTPS
- Supports WebSocket upgrade headers if needed by the framework
- Uses appropriate proxy headers
- Provides sensible timeouts

Bind Docker-published frontend and API ports to `127.0.0.1` only.

Do not expose application containers directly to the internet.

Provide instructions for:
- DNS A record configuration
- Nginx site configuration
- Certbot SSL installation
- Nginx configuration testing
- Nginx reload

Do not overwrite existing Nginx configurations.

The server hosts other applications.

---

## 9. GitHub Actions CI/CD

Implement GitHub Actions CI/CD similar to the workflow provided below.

Branches:
- `main` — development
- `production` — production deployment

### CI Pipeline

Run on:
- Pull requests
- Push to main
- Push to production

Steps:
1. Checkout repository
2. Setup Node.js 22
3. Install dependencies using `npm ci`
4. Run formatting check
5. Run ESLint
6. Run TypeScript type checking
7. Start PostgreSQL 16 test service
8. Run Knex migrations
9. Test migration rollback and reapply
10. Run automated tests
11. Build frontend and backend

Deployment must stop if CI fails.

### CD Pipeline

Deploy only when changes are pushed to `production`.

Steps:
1. Build API Docker image
2. Build frontend Docker image
3. Push images to GitHub Container Registry
4. Connect to VPS using SSH
5. Pull latest images
6. Run database migrations
7. Restart application containers
8. Verify health checks
9. Perform production smoke tests

Use image tags based on Git commit SHA.

Registry:

```text
ghcr.io/rukshan2000/kwings-accounts-api
ghcr.io/rukshan2000/kwings-accounts-web
```

Production domain:

```text
https://accounts.kwingsmedia.com
```

Smoke checks:

```text
https://accounts.kwingsmedia.com/api/health
https://accounts.kwingsmedia.com/login
```

Use GitHub Secrets:

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
DEPLOY_PORT
```

Use GitHub's GITHUB_TOKEN for GHCR authentication where possible.

Do not hardcode server IP addresses, passwords, or private keys.

Deployment must:
- Use GitHub Actions concurrency controls
- Avoid overlapping production deployments
- Preserve PostgreSQL data
- Avoid unnecessary downtime
- Fail safely if migrations fail
- Use versioned Docker images
- Support application rollback to a previous image

Run migrations as a one-off deployment step before switching application containers.

Use backward-compatible migrations to support safe application rollback.

Never automatically delete production volumes.

Create:
- GitHub Actions workflow
- Dockerfiles
- Production Docker Compose file
- Deployment shell script
- Nginx configuration example
- Environment variable template

Use the provided LMS CI/CD workflow as the architectural reference, but adapt all names, paths, images, health checks, and database configuration for Kwings Accounts.

---

## 10. Security Requirements

Implement:
- Secure password hashing
- HTTP-only authentication cookies
- Secure cookies in production
- SameSite cookie protection
- CSRF protection for cookie-authenticated mutations
- Rate limiting on login
- Server-side input validation
- Parameterized database queries through Knex
- Security headers
- No public registration
- No secrets in source control
- Authentication on all financial endpoints

Use a non-superuser PostgreSQL role for the running application.

Use a separate migration role if required.

---

## 11. Testing

Write essential automated tests for:

- Authentication
- Income creation
- Expense creation
- Account balance calculation
- Transfers between accounts
- Transaction editing and deletion
- Project profit calculation
- ROI calculation
- Date range filtering
- Financial data validation

Focus on correctness of financial calculations.

Do not add unnecessary testing frameworks or complicated infrastructure.

---

## 12. Features NOT Required

Do NOT implement:

- Double-entry general ledger
- Full bookkeeping/accounting standards
- Tax calculations
- VAT management
- Payroll
- Invoice generation
- Payment gateways
- Bank integrations
- Bank reconciliation
- Inventory
- Customer CRM
- Supplier management
- Multi-tenant architecture
- Multi-company support
- Multi-currency
- Complex user permissions
- AI features
- Notifications
- Email integrations
- Subscription billing
- Advanced analytics
- Mobile application

This is a simple internal financial management application, not a complete ERP system.

---

## 13. Implementation Instructions

Follow this implementation order:

**Phase 1 — Project Setup**
- Initialize monorepo
- Configure Next.js and Express
- Configure TypeScript
- Configure PostgreSQL and Knex
- Configure Docker
- Configure environment variables

**Phase 2 — Database & Authentication**
- Create migrations
- Create initial categories
- Implement administrator authentication
- Implement protected routes

**Phase 3 — Core Financial Features**
- Financial accounts
- Income management
- Expense management
- Account transfers
- Account balances

**Phase 4 — Profitability**
- Dashboard
- Projects
- Investments
- ROI calculations

**Phase 5 — Reports**
- Financial reports
- Date filtering
- CSV exports

**Phase 6 — Production**
- Docker production builds
- GitHub Actions CI/CD
- Nginx configuration
- Deployment scripts
- Production documentation

---

## 14. Final Requirements

Important development rules:

1. Keep the codebase simple and maintainable.
2. Do not overengineer.
3. Use reusable components where beneficial.
4. Use Knex migrations for every schema change.
5. Never use floating-point arithmetic for money.
6. Keep financial calculations on the backend.
7. Use real database data, not hardcoded dashboard values.
8. Keep the interface clean and professional.
9. Ensure mobile responsiveness.
10. Follow basic production security practices.
11. Do not introduce features outside the defined MVP.
12. Avoid unnecessary dependencies.
13. Do not leave unfinished TODO implementations.
14. Ensure all core functionality works end-to-end.
15. Do not deploy to production without explicit permission.

### Expected Deliverables

Provide a fully functional repository containing:

- Working Next.js frontend
- Working Express backend
- PostgreSQL database migrations
- Functional authentication
- Financial management features
- Dashboard and reports
- Docker configuration
- GitHub Actions CI/CD
- Nginx configuration
- Deployment scripts
- README with local and production setup instructions

Start by inspecting the existing repository.

If the repository is empty, initialize the project.

Create a short implementation plan, then implement the complete MVP phase by phase.

Do not stop after creating the architecture or documentation.

Actually implement the application, run tests, fix errors, and verify that it builds successfully.

**Final goal: A simple, reliable accounting dashboard for Kwings Media, deployable at accounts.kwingsmedia.com.**