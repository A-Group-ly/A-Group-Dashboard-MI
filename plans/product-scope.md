# A-Group Subscription Dashboard Product Scope

## 1. Product Vision and Goals

The A-Group Subscription Dashboard is a bilingual, responsive subscription-management and financial-operations platform designed for external businesses and organizations (tenants) to manage their own customers, products, subscriptions, invoices, and simulated payment records. Additionally, it provides A-Group with a separate portfolio-management capability for its owned products and business units.

**Primary Goals:**
- Provide a secure, isolated environment for each tenant to manage their financial operations.
- Offer A-Group a consolidated view of its portfolio entities (A-Stay, A-Market, A-Space, Corporate, Tech Infrastructure) for internal financial oversight.
- Support dual-currency (LYD and USD) with strict separation unless an auditable exchange process is implemented.
- Deliver a polished, accessible dashboard experience in English and Arabic, including RTL layout and light/dark themes.
- Enable reliable deployment, database migrations, monitoring, and operational recovery with minimal manual intervention.

**Core Principles:**
- Tenant data isolation: No cross-tenant data leakage; organization IDs and roles must be verified server-side.
- Fictional demo data only: No real customer or financial data is used or stored without explicit authorization and proper environment safeguards.
- Security by design: Authentication, authorization, input validation, and audit trails are integral to all features.
- Clear separation of concerns: Platform organization/tenant, tenant customer, and A-Group portfolio entity are distinct concepts.

## 2. Users, Organizations, and Key Domain Concepts

### 2.1. Platform Organization/Tenant
A business or organization that signs up to use the dashboard. Each tenant has:
- Unique identifier and subdomain (if applicable).
- Isolated database schema or row-level security ensuring data cannot be accessed by other tenants.
- Ability to manage their own customers, products, subscriptions, and invoices.
- Control over user memberships and roles within their organization.

### 2.2. Tenant Customer
An entity (person or company) that belongs to a specific tenant and uses that tenant's products or services. Tenant customers:
- Are managed exclusively by their parent tenant.
- Have their own profile, subscription history, and billing details.
- Cannot be viewed or managed by other tenants.

### 2.3. A-Group Portfolio Entity
A product, business unit, or service owned or managed by A-Group Holding (e.g., A-Stay, A-Market, A-Space, Corporate, Tech Infrastructure). These are:
- Managed within the dashboard as part of A-Group's internal portfolio.
- Treated similarly to tenant customers for financial tracking but with distinct administrative controls.
- Used for A-Group's internal financial reporting and budgeting.

### 2.4. Key Financial Concepts
- **Subscriptions:** Recurring agreements for access to a product or service, with defined billing cycles and pricing.
- **Invoices:** Documents requesting payment for goods or services provided, tied to subscriptions or one-time charges.
- **Payment Records:** Simulated records of payment attempts (successful, failed, pending) for invoices.
- **Financial Transactions:** Individual income or expense entries that feed into accounting and reporting.
- **Budgets:** Planned expenditure limits for platforms or cost centers, monitored against actual expenses.
- **Opening Balances:** Starting cash or bank balances used for illustrative cash flow calculations.
- **MRR/ARR:** Monthly and Annual Recurring Revenue derived from active subscriptions.
- **Cash Flow:** Net change in cash position from operating activities (illustrative in demo data).

## 3. Explicit Terminology and Domain Boundaries

To avoid ambiguity, the following terms are strictly defined:

| Term | Definition | Boundary Notes |
|------|------------|----------------|
| **Platform** | A-Group's internal business unit (e.g., A-Stay, A-Market). | Not interchangeable with tenant or tenant customer. |
| **Tenant** | An external organization using the dashboard. | Each tenant's data is isolated; no cross-tenant access. |
| **Tenant Customer** | A customer belonging to a specific tenant. | Managed only by the parent tenant; not visible to A-Group or other tenants. |
| **A-Group Portfolio Entity** | A product or business unit owned by A-Group. | Managed separately from tenant data; used for internal portfolio oversight. |
| **Subscription** | A recurring billing agreement between a tenant and its customer. | Includes trials, renewals, upgrades, downgrades, and cancellations. |
| **Invoice** | A billing document issued by a tenant to its customer. | May be one-time or tied to a subscription cycle. |
| **Payment Record** | A simulated log of a payment attempt (success/failed/pending). | No real payment processing; used for demo and testing only. |
| **Financial Transaction** | An accounting entry (income/expense) affecting account balances. | Derived from invoices, payments, or manual entries; used in reports. |
| **MRR** | Monthly Recurring Revenue from active subscriptions. | Calculated per tenant and currency; excludes one-time invoices. |
| **ARR** | Annual Recurring Revenue (MRR × 12). | Same currency and tenant isolation rules as MRR. |
| **Available Cash** | Illustrative estimate based on opening balance + cumulative net income/expenses. | Not a real bank balance; labeled as illustrative in demo data. |
| **Budget Overrun** | Amount by which actual expenses exceed the monthly budget cap. | Can be negative (underspend) or positive (overrun). |

## 4. The Five Product Categories and Their Feature Inventories

### Category 1 — Dashboard Experience and Interface

| Feature | Description | Priority | Dependencies | Acceptance Criteria |
|---------|-------------|----------|--------------|---------------------|
| Responsive Layout | Dashboard adapts to desktop, tablet, and mobile breakpoints. | P0 | None | Layout remains functional and readable at widths ≥320px. |
| Navigation Sidebar | Persistent sidebar for platform selection (A-Stay, A-Market, etc.) and all-tenants view. | P0 | None | Sidebar toggles on mobile; platform selection updates main content. |
| Header Controls | Month, currency (LYD/USD), language (EN/AR) selectors in header. | P0 | None | Changing controls updates all displayed data without full reload. |
| KPI Cards | Six executive metrics: Income, Expenses, Net Result, Available Cash, Remaining Budget, Customer Collections. | P0 | Financial data source (API or demo) | KPIs show correct values, currency, and MoM change indicators. |
| Additional Metrics Row | Cash Collected, Pending Income, Budget Overrun (when applicable). | P0 | Financial data source | Values match transaction filters and statuses. |
| Payment Channel Breakdown | Visualization of income/expenses by payment method (when data available). | P1 | Payment method data in transactions | Breakdown shows percentage and amount per method; empty state handled. |
| Cash Flow Chart | Bar chart comparing income vs. expenses for current and previous month. | P0 | Transaction data for two months | Chart renders with correct values, labels, and currency formatting. |
| Budget Burndown | Progress bar showing expenses vs. budget cap, with upcoming obligations. | P0 | Budget cap and expense data | Bar color changes based on usage; overrun displayed in red. |
| Transactions Table | Searchable, filterable, paginated table of financial records. | P0 | Transaction data | Table supports search, status/category/payment method filters, and pagination. |
| Localization (EN/AR) | All UI text available in English and Arabic; RTL layout when Arabic selected. | P0 | Translation files | Language switch updates all text; direction changes to rtl/ltr. |
| Light/Dark Themes | Dashboard adapts to system preference or manual toggle (via CSS class). | P0 | CSS variables | Colors update correctly when switching themes; contrast ratios meet WCAG AA. |
| Loading/Empty/Error States | Placeholders and messages for data fetching, empty results, and API failures. | P0 | API integration | Loading spinners shown during fetch; empty states display guidance; errors show retry option. |
| Accessibility | Keyboard navigation, ARIA labels, focus management, and screen-reader support. | P0 | Semantic HTML | All interactive elements reachable via Tab; labels announced by screen readers. |
| Demo Data Labeling | Clear indicators when data is illustrative/sample (e.g., banner, tooltips). | P0 | Demo data source | Demo data notice visible in header; tooltips on illustrative metrics. |
| TV/Display Mode | Read-only presentation for wall-mounted displays: auto-rotating sections, configurable refresh, pause/resume, stale-data warnings, reduced motion. | P2 | Dashboard data APIs | Mode hides edit controls; rotates sections every N minutes; shows last sync status; disables interactions. |
| Safe Display-Mode Handling | Ensures no sensitive data (e.g., PII, detailed transaction notes) appears in TV mode. | P2 | Data filtering layer | TV mode shows only aggregated metrics and non-sensitive labels; hides customer names and references. |

### Category 2 — Organizations, Customers, and Subscription Operations

| Feature | Description | Priority | Dependencies | Acceptance Criteria |
|---------|-------------|----------|--------------|---------------------|
| Organization Management | Super-admin view to create/manage tenants; tenant admins manage their own org settings. | P0 | Auth system, database | Super-admin can invite tenants; tenant admins can update name, contact info, and billing settings. |
| Organization Memberships & Invitations | Role-based invitations (Admin, Finance, Analyst, Read-only) within a tenant. | P0 | Auth system, roles | Invitations expire after 7 days; accepted users appear in org membership list with correct role. |
| A-Group Portfolio Management | Separate section for A-Group to manage its platforms (A-Stay, etc.) as portfolio entities. | P0 | Platform model, auth | A-Group admins can view financials per platform; no ability to modify tenant data. |
| Customer Directory | Searchable list of a tenant's customers with contact info and segmentation tags. | P1 | Customer model, auth | Tenant admins can add/edit customers; search by name/email; view subscription history. |
| Customer Segmentation & Health Indicators | Tags (e.g., Enterprise, SMB) and health scores based on payment history, login frequency, etc. | P2 | Customer model, transaction history | Health indicators update nightly; segments filterable in customer directory. |
| Product Catalog & Subscription Plans | Tenant-defined products and recurring plans (price, interval, currency, trial days). | P0 | Product and plan models | Tenant admins can create plans; plans enforce currency and interval; trials convert to paid. |
| Subscription Creation & Management | Create, view, update, and cancel subscriptions; track lifecycle status (active, trial, past_due, canceled). | P0 | Subscription model, invoicing | Subscription creation validates plan; upgrades/downgrades prorate; cancellations effective at period end. |
| Subscription Lifecycle & Status Transitions | Enforced rules for status changes (e.g., trial → active, active → past_due → canceled). | P0 | Subscription model, cron jobs | Status transitions only via allowed paths; webhooks update status on payment success/failure. |
| Trials, Renewals, & Recurring Billing Rules | Automatic trial conversion, renewal attempts, and retry logic for failed payments. | P1 | Payment simulator, cron jobs | Trials end after set days; renewals attempt 3 times over 3 days; failed payments trigger dunning. |
| Upgrades, Downgrades, Plan Changes, & Proration | Mid-cycle plan changes with credit/refund for unused portion. | P1 | Subscription model, invoicing | Proration calculated accurately; invoice reflects adjusted amount; no double-charging. |
| Cancellation, Expiration, & Reactivation | Options to cancel immediately or at period end; expired subscriptions can be reactivated. | P1 | Subscription model | Cancellation stops future invoices; reactivation restores subscription with next billing date. |
| Invoices & Billing Documents | Generate PDF/invoice views for one-time charges and subscription cycles; track status (draft, sent, paid, void). | P0 | Invoice model, transaction linking | Invoices show line items, tax (if applicable), due date; status updates on payment. |
| Payment Records & Payment Statuses | Simulated payment attempts (success/failed/pending) linked to invoices; retry counts. | P0 | Payment simulator, invoice model | Payment records show provider, amount, date, and status; failed payments increment retry count. |
| Outstanding Balances & Collections | View of overdue invoices and expected cash; dunning levels and collection efforts. | P1 | Invoice model, payment records | Outstanding balance sums invoices past due; collections team can mark as contacted. |
| Payment Methods, Providers, & Reconciliation Records | Simulated payment methods (cash, card, bank transfer) and providers; reconciliation against bank statements. | P2 | Payment method model, provider integrations | Reconciliation matches payment records to simulated bank feeds; mismatches flagged for review. |
| Billing History & Operational Audit Trail | Immutable log of all billing-related actions (invoice created, payment attempted, subscription changed). | P1 | Audit log model | Audit trail shows user, timestamp, action, and IP; exportable for compliance. |
| Validation, Duplicate Prevention, & Data-Quality Checks | Server-side validation for unique constraints (e.g., invoice numbers), mandatory fields, and logical consistency. | P0 | API validation layer | Duplicate subscription creation blocked; invalid plan changes rejected; referential integrity maintained. |
| Customer & Subscription Exports | CSV export of customer list and subscription details for reporting or migration. | P2 | Export service, auth | Export includes all non-PII fields; respects tenant isolation; formatted for spreadsheet import. |
| Fictional Demo Data & Simulated Billing Workflows | Pre-seeded demo data for tenants and platforms; simulated payment success/failure for testing. | P0 | Seed scripts, demo data generator | Demo data loads on first run; simulated payments succeed/fail based on configurable rules; no real money movement. |

### Category 3 — Finance, Analytics, and Reporting

| Feature | Description | Priority | Dependencies | Acceptance Criteria |
|---------|-------------|----------|--------------|---------------------|
| Financial Transaction Management | CRUD operations for income/expense entries; categorization by platform, category, and payment method. | P0 | Transaction model, auth | Transactions require amount, currency, date, type, category; platform optional; edits create audit trail. |
| Revenue Classification & Recognition | Separate tracking of invoiced revenue, collected cash, recognized revenue (accrual), and recurring revenue (MRR). | P1 | Invoice and payment models | Recognized revenue includes paid and pending invoices; MRR only counts active subscription amounts. |
| MRR & ARR Calculations | Monthly and Annual Recurring Revenue from active subscriptions, broken by currency and tenant. | P0 | Subscription model, currency filter | MRR sums subscription amounts for active status; ARR = MRR × 12; excludes one-time invoices and trials. |
| Cash Flow & Financial Account Balances | Illustrative cash position (opening balance + net income/expenses) per currency; optional real bank sync. | P0 | Opening balance, transaction aggregation | Available Cash = opening balance + sum(income) - sum(expenses paid); labeled illustrative in demo. |
| Budget Planning & Monitoring | Define monthly expense caps per platform or company-wide; track actual vs. budget; alerts on overruns. | P0 | Monthly budget model, expense transactions | Budget cap settable per currency; remaining budget shows overspend in red; alerts trigger at 80% usage. |
| Subscription Performance Analytics | Metrics like churn rate, LTV, conversion rate, and average revenue per user (ARPU) per tenant. | P2 | Subscription and customer data | Churn = (canceled subscriptions / total at start) × 100; LTV estimates based on average lifespan. |
| Financial Reports | Standard reports: Income Statement, Cash Flow Statement, Subscription Revenue Report, Aging Receivables. | P1 | Transaction aggregation, report generator | Reports downloadable as PDF/CSV; filters for date range, currency, platform; footnotes clarify illustrative data. |
| Filters, Comparisons, & Drill-Down | Ability to compare periods (MoM, YoY), filter by platform/category, and drill from summary to transactions. | P1 | Query parameters, API endpoints | Changing filters updates all charts and tables; drill-down shows underlying transactions; comparisons show delta and %. |
| Financial Precision, Data Quality, & Reconciliation | Decimal precision (19,4) for currency amounts; reconciliation processes to ensure transaction integrity. | P0 | Decimal fields, audit trails | Amounts store with 4 decimal places; reconciliation reports match transaction sums to account balances; discrepancies investigated. |
| Saved Reports & CSV Exports | Save report configurations with filters and schedule email delivery; export to CSV for external analysis. | P2 | Report scheduler, email service | Saved reports run on schedule; emails contain secure links; CSV exports respect tenant isolation and PII redaction. |
| Financial Alerts & Threshold Indicators | Configurable alerts for low cash, high expenses, failed payment spikes, or budget overruns. | P1 | Alert engine, notification service | Alerts trigger when thresholds breached; notifications via email/in-app; alert history viewable. |
| Financial Access Controls, Audit Trails, & Operational Boundaries | Role-based access to financial data (e.g., Finance sees all, Analyst sees reports only, Read-only sees dashboards). | P0 | Role system, middleware | Finance role can create/edit transactions; Analyst cannot modify data; Read-only sees no edit controls; all changes logged. |

### Category 4 — Authentication, Permissions, and Data Integrity

| Feature | Description | Priority | Dependencies | Acceptance Criteria |
|---------|-------------|----------|--------------|---------------------|
| Clerk Authentication | Integration with Clerk for user sign-in, sign-up, session management, and social login. | P0 | Clerk SDK, environment variables | Users sign in via email/password or social providers; session cookie set; tokens validated on API routes. |
| Local User Records & Account Status | Local database record for each Clerk user, tracking isActive status, role, and organization memberships. | P0 | User model, Clerk webhook | On user.created, local User record created with isActive=true; on user.deleted, isActive set false; role syncs from Clerk public metadata. |
| Organization & Tenant Isolation | Middleware and route handlers verify that authenticated user belongs to the requested organization via server-side checks. | P0 | Organization membership model, middleware | API requests to /api/dashboard?orgId=X return 403 if user not member of org X; no financial data leaked. |
| Roles & Permissions | Role definitions: Admin (full access), Finance (transactions and reports), Analyst (reports only), Read-only (dashboard only). | P0 | Role model, middleware | Role checks on API routes; Admin can manage org memberships; Finance can view/edit transactions; Analyst cannot edit; Read-only sees no edit controls. |
| Organization Memberships & Invitations | Secure invitation flow: inviter sends email invite; invitee accepts and sets password; inviter assigns role. | P0 | Invitation model, email service | Invitation token expires in 7 days; accepted user appears in org with correct role; inviter can revoke pending invites. |
| Controlled A-Group Portfolio & Cross-Organization Administration | Super-admin role (held by A-Group) to manage tenants and view aggregated portfolio data; cannot modify tenant data. | P0 | Super-admin flag, tenant model | Super-admin sees list of tenants; can suspend/resume tenant access; cannot view tenant-specific customer data or edit transactions. |
| Protected Browser Pages & API Routes | All dashboard pages and API routes under /app/(protected) require authentication; public routes (landing, health) excluded. | P0 | Middleware, route guards | Attempt to access protected page without session redirects to sign-in; API routes return 401/403 for unauthenticated/unauthorized. |
| Verified Clerk Webhook Synchronization | Endpoint to receive Clerk events (user.created, updated, deleted) with signature validation; updates local user record. | P0 | Webhook route, svix library | Webhook returns 200 for valid signature; updates user email/name/image; sets isActive=false on user.deleted; idempotent via upsert. |
| Input Validation & Safe Error Handling | Server-side validation of all inputs; sanitization to prevent injection; error messages avoid leaking stack traces. | P0 | Validation libraries, error handling middleware | Invalid inputs return 400 with field-specific errors; SQL injection attempts blocked; errors log internally but show generic message to user. |
| Referential Integrity & Consistent Database Operations | Foreign key constraints and transactional updates to prevent orphaned records; use of Prisma transactions for multi-step ops. | P0 | Prisma schema, transaction API | Deleting a platform sets platformId to null on related transactions (SET NULL); deleting a customer cascades to subscriptions if appropriate; budget month/currency/platformId unique constraint prevents duplicates. |
| Security Audit Trails | Immutable log of authentication events (login/logout/failure), permission changes, and data access for compliance. | P1 | Audit log model, middleware | Audit trail shows timestamp, user, action, IP, and user agent; exportable for SIEM; retention period configurable. |
| Session & Account Security | Secure session settings; password policies; brute-force protection; session rotation on sensitive actions. | P0 | Clerk configuration, middleware | Session cookies use Secure, SameSite=Strict; Clerk brute-force protection enabled; password change requires re-authentication; sessions invalidated on password change. |
| Rate Limiting & Abuse Resistance | Limit API requests per IP/user to prevent scraping and DoS; distinguish between burst and sustained traffic. | P1 | Rate limiting middleware, Redis or upstash | Authenticated users allowed 100 req/min; unauthenticated 20 req/min; exceeded limits return 429 with retry-after header; limits logged for monitoring. |
| Secret Management & Secure Configuration | Storage of secrets in environment variables; never commit .env; use of vault or platform secrets in production. | P0 | .env.example, deployment platform | .env.example shows variable names only; production uses platform secrets (e.g., Vercel Env, Wrangler secrets); no secrets in logs or client-side code. |
| Authentication, Authorization, Tenant-Isolation, & Regression Tests | Automated test suite covering auth flows, role-based access, and data isolation boundaries. | P0 | Testing framework (Jest/Vitest), test database | Tests run on CI; cover sign-in/sign-up, role transitions, cross-org access attempts, and webhook scenarios; 90%+ line coverage. |
| Security Incident & Recovery Readiness | Playbook for suspected breaches; steps to revoke sessions, rotate secrets, and restore from backups. | P2 | Incident response guide, backup procedures | Documentation includes steps to revoke all sessions, rotate DATABASE_URL and Clerk secrets, and verify data integrity post-incident; recovery time objective (RTO) defined. |

### Category 5 — Infrastructure, Deployment, and Product Reliability

| Feature | Description | Priority | Dependencies | Acceptance Criteria |
|---------|-------------|----------|--------------|---------------------|
| Deployment Architecture & Runtime Compatibility Validation | Verify compatibility of Next.js 16.4.0, Prisma 5.22.0, Clerk @clerk/nextjs@^6.0.0, Neon PostgreSQL, and Cloudflare Workers before deployment. | P0 | Version matrix, PoC results | PoC in separate repo passes Group A tests; compatibility risks documented; fallback to Vercel identified if Workers fails. |
| Neon PostgreSQL Configuration | Use Neon with connection pooling (-pooler endpoint) for efficient connection usage in serverless environment. | P0 | Neon project, DATABASE_URL | Connection string includes sslmode=require&pgbouncer=true; Prisma client uses Neon driver; pool size monitored via Neon dashboard. |
| Prisma Schema & Migration Management | Version-controlled schema; migrations generated and applied via CI/CD; seed script for demo data. | P0 | Prisma CLI, migration folder | prisma migrate deploy runs successfully; seed script is idempotent; migrations are reviewed before apply. |
| Environment Configuration & Secret Management | Separate .env files for development, preview, and production; secrets injected at runtime via platform. | P0 | .env.example, platform secrets | Development uses .env.local (not committed); preview/production use platform-provided secrets; no hardcoded secrets in codebase. |
| Cloudflare Deployment & Custom-Domain Readiness | Deploy via OpenNext and Wrangler; verify worker.js size and cold-start readiness; prepare for custom domain setup. | P0 | OpenNext, Wrangler, custom domain DNS | wrangler deploy succeeds; worker responds to health check; custom domain can be added via Cloudflare dashboard after CNAME verification. |
| CI/CD & Automated Quality Gates | GitHub Actions workflow for linting, testing, building, Prisma generate, and deployment to preview/production. | P0 | GitHub Actions, test suite | Workflow runs on push to main; lint and test must pass; build step includes prisma generate; deployment to preview on every merge to dev; production on manual trigger. |
| Health Checks, Readiness, & Runtime Diagnostics | Endpoint (/api/health) returning database connectivity, version, and timestamp; readiness checks for dependent services. | P0 | Health route, Prisma client | /api/health returns 200 with {status: "healthy", database: "connected"} when DB reachable; 503 if DB fails; includes Git SHA and uptime. |
| Logging, Monitoring, & Error Reporting | Structured logging to stdout; error tracking via Sentry or similar; performance monitoring via web vitals. | P1 | Logging library, monitoring service | Logs include timestamp, level, and message; errors captured with stack trace in production; web vitals reported to analytics endpoint; PII excluded from logs. |
| Database Backups & Recovery | Automated daily backups of Neon database; point-in-time recovery (PITR) capability; restore procedures documented. | P1 | Neon backup config, restore scripts | Backups visible in Neon dashboard; restore test performed quarterly; RPO < 24 hours; RTO < 4 hours for critical incidents. |
| Performance & Resource Management | Monitor response times, CPU usage, and memory leaks; optimize queries and add caching where beneficial. | P1 | Monitoring dashboards, query explain | 95th percentile API response time < 500ms after warm; CPU per request < 50ms to stay within free tier; slow queries logged and optimized; caching layer (e.g., Redis) considered for repeated reports. |
| Dependency & Supply-Chain Maintenance | Regular audits of npm packages for vulnerabilities and updates; lockfile maintained; upgrade schedule. | P0 | npm audit, dependabot | npm audit shows no high/critical vulnerabilities; dependabot configured for weekly PRs; lockfile committed; major version upgrades tested in branch before merge. |
| Safe Demo-Data Seeding & Environment Safeguards | Seed script uses upsert to avoid duplicates; runs only in non-production environments unless explicitly approved; demo data clearly labeled. | P0 | Seed script, environment check | Seed script checks NODE_ENV !== 'production' or uses flag; demo data notices present in UI; no real customer data ever seeded. |
| Repository Setup, README, & Developer Documentation | Clear setup instructions, contributing guide, and architecture overview for new developers. | P0 | README.md, contributing.md | README includes install, dev server, and test commands; contributing guide outlines PR process; architecture doc describes data flow and auth. |
| Production Security & Release Checklist | Pre-deployment checklist: secret verification, migration review, backup confirmation, smoke test in preview. | P1 | Checklist document, approval workflow | Checklist completed and signed off by dev, security, and product leads; release notes generated; rollback plan tested. |
| Deployment Rollback & Operational Recovery | Ability to revert to previous deployment via platform rollback feature; hotfix branches for critical patches. | P1 | Platform rollback (e.g., Vercel, Wrangler), Git tags | wrangler rollback or Vercel redeploy restores previous version; hotfix branch created from main; rollback tested in staging before need. |
| Free-Tier Limits, Cost Management, & Resource Constraints | Monitor usage against free tiers of Workers (100k req/day, 30s CPU/day), Clerk (10k MAU), Neon (0.5GB storage, 190 compute hrs/mo); optimize to stay within limits. | P1 | Usage dashboards, alerting | Daily request count < 80k; CPU time < 25s/day; MAU < 8k; storage < 0.4GB; alerts trigger at 80% of limits; plan to upgrade if growth exceeds projections. |

## 5. P0/P1/P2 Priority Classification for Every Feature

All features have been classified with priority levels in the tables above. Summary:

**P0 (Required for initial release)**: Core dashboard layout, navigation, header controls, KPI cards, additional metrics row, cash flow chart, budget burndown, transactions table, localization (EN/AR), light/dark themes, loading/empty/error states, accessibility, demo data labeling, organization management, memberships & invitations, A-Group portfolio management, product catalog & subscription plans, subscription creation & management, subscription lifecycle & status transitions, invoices & billing documents, payment records & payment statuses, outstanding balances & collections, validation & duplicate prevention, financial transaction management, MRR & ARR calculations, cash flow & financial account balances, budget planning & monitoring, financial precision & reconciliation, Clerk authentication, local user records, organization & tenant isolation, roles & permissions, protected pages & API routes, verified Clerk webhook, input validation, referential integrity, secret management, authentication/authorization/tests, deployment architecture validation, Neon PostgreSQL config, Prisma schema & migrations, environment configuration, Cloudflare deployment, CI/CD, health checks, dependency maintenance, safe demo-data seeding, repository setup.

**P1 (Important follow-up)**: Payment channel breakdown, customer directory, customer segmentation & health indicators, trials renewals & billing rules, upgrades/downgrades/plan changes/proration, cancellation/expiration/reactivation, payment methods providers & reconciliation, billing history & audit trail, customer & subscription exports, financial reports, filters comparisons & drill-down, subscription performance analytics, financial alerts & thresholds, security audit trails, session & account security, rate limiting, logging monitoring & error reporting, database backups & recovery, performance & resource management, production security checklist, deployment rollback, free-tier limits.

**P2 (Advanced enhancements)**: TV/display mode, safe display-mode handling, customer segmentation & health indicators, payment methods providers & reconciliation, customer & subscription exports, subscription performance analytics, saved reports & CSV exports, financial access controls audit trails, security incident recovery readiness.

## 6. Functional Requirements and Acceptance Criteria

Functional requirements and acceptance criteria are detailed in the feature tables above (Sections 4.1 through 4.5). Each feature includes:
- **Description**: Purpose and expected behavior
- **Priority**: P0, P1, or P2 classification
- **Dependencies**: What other features or systems must be in place
- **Acceptance Criteria**: Measurable conditions that must be met for completion

Key acceptance criteria patterns:
- UI/UX: Responsive behavior, correct localization, theme adaptation, accessibility compliance
- Data Integrity: Server-side validation, referential integrity, tenant isolation, audit trails
- Performance: Response times under defined thresholds, resource usage within limits
- Security: Authentication required, authorization enforced, secrets protected
- Business Logic: Correct calculations, valid status transitions, accurate financial reporting
- Reliability: Error handling, loading states, retry mechanisms, fallback to demo data

## 7. Cross-Cutting Requirements

### Security
- **Authentication**: Clerk integration with server-side session validation
- **Authorization**: Role-based access control (Admin, Finance, Analyst, Read-only) enforced on all API routes
- **Tenant Isolation**: Organization IDs and roles verified server-side; no client-side trust for data access
- **Data Protection**: No real customer data used; fictional demo data only; PII excluded from logs and exports
- **Secrets Management**: Environment variables only; never commit .env; use platform secrets in production
- **Input Validation**: Server-side validation on all inputs; sanitization to prevent injection
- **Audit Trails**: Immutable logs for authentication, data changes, and billing operations
- **Rate Limiting**: API request limits per IP/user to prevent abuse
- **Session Security**: Secure cookies, password policies, brute-force protection

### Tenant Isolation
- **Architecture**: Row-level security or separate schemas ensuring no cross-tenant data leakage
- **Verification**: Server-side checks on all API requests to confirm user belongs to requested organization
- **Data Scoping**: All queries filtered by organization ID derived from authenticated user's memberships
- **Super-Admin Access**: A-Group administrators can view aggregated portfolio data but cannot modify tenant-specific data
- **Invitation System**: Secure role-based invitations with expiration and revocation capabilities

### Localization & Accessibility
- **Bilingual Support**: Complete English and Arabic translations for all UI elements
- **RTL/LTR Layout**: Automatic direction switching based on language selection
- **Accessibility**: WCAG AA compliance for color contrast, keyboard navigation, ARIA labels, screen-reader support
- **Theme Adaptation**: Light and dark themes with proper color scaling and contrast maintenance
- **Demo Data Labeling**: Clear indicators when data is illustrative/sample to prevent confusion with real data

### Data Quality & Auditability
- **Financial Precision**: Decimal precision (19,4) for all currency amounts to prevent rounding errors
- **Reconciliation**: Processes to ensure transaction integrity between invoices, payments, and account balances
- **Validation Rules**: Server-side enforcement of business logic (e.g., subscription status transitions, proration calculations)
- **Audit Trails**: Timestamped, user-attributed logs for all significant actions and data changes
- **Consistency Checks**: Referential integrity maintained through foreign key constraints and transactional operations
- **Reporting Accuracy**: Clear distinction between invoiced revenue, collected cash, recognized revenue, and recurring revenue

## 8. Data-Model and Migration Dependencies

| Component | Description | Dependencies | Migration Notes |
|-----------|-------------|--------------|-----------------|
| **User Model** | Local user records linked to Clerk users; tracks isActive status, role, and organization memberships | Clerk authentication, Organization model | Initial migration creates User table with clerkUserId unique index; subsequent migrations add role and organizationId fields |
| **Organization Model** | Tenant organizations using the dashboard; isolated data containers | User model (for ownership), Platform model (for A-Group portfolio) | Initial migration creates Organization table; foreign key to User for owner/admin; unique constraint on subdomain/code |
| **Platform Model** | A-Group's internal business units (A-Stay, A-Market, etc.) for portfolio tracking | Organization model (for tenant vs platform distinction) | Initial migration creates Platform table with code unique index; sample data in seed script |
| **FinancialTransaction Model** | Core accounting entries for income and expenses | Currency enum, TransactionType enum, TransactionStatus enum, PaymentMethod enum, Platform (optional), FinancialAccount (optional) | Initial migration creates table with comprehensive indexes for reporting performance; Decimal(19,4) precision for currency amounts |
| **FinancialAccount Model** | Bank accounts, cash registers, and digital wallets holding funds | AccountType enum, Currency enum | Initial migration creates table; unique constraints prevent duplicate account names per currency/type |
| **MonthlyBudget Model** | Planned expenditure limits for platforms or company-wide | Currency enum, Platform (optional) | Initial migration creates table with unique constraint on month/currency/platformId to prevent duplicate budgets |
| **OpeningBalance Model** | Starting balances used for illustrative cash flow calculations | Currency enum | Initial migration creates table with unique constraint on effectiveDate/currency; illustrative values in seed script |
| **Customer Model** (Future) | Tenant customers for subscription management | Organization model | Planned for P1; will include contact info, segmentation tags, and subscription history |
| **Subscription Model** (Future) | Recurring billing agreements between tenants and customers | ProductPlan model, Customer model, Invoice model | Planned for P1; will track lifecycle status, billing interval, trial periods, and proration calculations |
| **Invoice Model** (Future) | Billing documents for one-time charges and subscription cycles | Customer model, Subscription model, PaymentRecord model | Planned for P1; will track status (draft, sent, paid, void), due dates, line items, and tax calculations |
| **PaymentRecord Model** (Future) | Simulated payment attempts linked to invoices | Invoice model, PaymentMethod model | Planned for P1; will track provider, amount, date, status, and retry counts for failed payments |
| **ProductPlan Model** (Future) | Template for recurring subscription plans | Organization model | Planned for P1; will define price, interval, currency, trial days, and renewal rules |

Migration dependencies follow this order:
1. Enums (Currency, TransactionType, TransactionStatus, PaymentMethod, AccountType)
2. Core tables (Platform, Organization, User)
3. Financial core (FinancialAccount, FinancialTransaction, OpeningBalance, MonthlyBudget)
4. Customer-facing tables (Customer, Subscription, Invoice, PaymentRecord, ProductPlan) - P1+
5. Audit and reporting tables (SecurityAudit, FinancialReport, AlertLog) - P1+
6. Indexes are created concurrently with tables for optimal query performance

All migrations are designed to be:
- **Idempotent**: Safe to reapply without side effects
- **Backward Compatible**: Do not break existing functionality when applied
- **Reviewed**: Schema changes examined in PR before application
- **Tested**: Applied to test database in CI before staging/production

## 9. External Integrations and Deployment Dependencies

| Integration | Purpose | Version/Package | Verification Status | Notes |
|-------------|---------|-----------------|---------------------|-------|
| **Next.js** | React framework for SSR and App Router | 16.4.0 | Used in project | App Router with server components; Turbopack disabled for Cloudflare compatibility |
| **React** | UI library | 19.3.0 | Used in project | Compatible with Next.js 16.4.0 |
| **Prisma ORM** | Database ORM and migration tool | 5.22.0 | Used in project | Binary engine selected for Cloudflare Workers compatibility |
| **@prisma/client** | Prisma client generator | 5.22.0 | Used in project | Generated from prisma schema |
| **Clerk** | Authentication and user management | @clerk/nextjs@^6.0.0 | Used in project | Requires webhook setup for session synchronization |
| **Svix** | Webhook signature verification | svix@^1.0.0 | Used in project | Used in Clerk webhook route for signature validation |
| **Neon PostgreSQL** | Managed PostgreSQL with connection pooling | Service | To be configured | Uses -pooler endpoint with sslmode=require&pgbouncer=true |
| **OpenNext** | Next.js adapter for Cloudflare Workers | @opennextjs/cloudflare@^1.0.0 | Documented but not tested | Requires nodejs_compat flag; verified compatibility claimed |
| **Wrangler** | Cloudflare Workers CLI and deployment tool | wrangler@^3.0.0 | Documented but not tested | Used for building and deploying to Workers platform |
| **Cloudflare Workers** | Serverless execution platform | Service | To be deployed | Free tier: 100k requests/day, 30s CPU/day; requires compatibility validation |
| **Tailwind CSS** | Utility-first CSS framework | ^4 | Used in project | For styling and responsive design |
| **TypeScript** | Typed superset of JavaScript | ^5 | Used in project | Provides type safety for frontend and backend |
| **ESLint** | JavaScript/TypeScript linter | ^9 | Used in project | Configured with eslint-config-next for Next.js best practices |
| **GitHub Actions** | CI/CD automation platform | Service | Used in project | Runs lint, test, build, and deployment workflows |
| **Vercel** (Fallback) | Alternative deployment platform | Service | Not configured | Available if Cloudflare Workers PoC fails; native Next.js support |

Deployment dependencies and verification requirements:
- **Prisma + Cloudflare Workers**: Requires nodejs_compat flag and binary engine; verified compatibility claimed but not tested in this codebase (see auth-specification.md for PoC plan)
- **OpenNext + Next.js 16.4.0**: May conflict with Turbopack; requires disabling Turbopack in next.config.ts
- **Clerk + Cloudflare Workers**: Requires proper webhook setup and nodejs_compat for crypto operations
- **Neon + Cloudflare Workers**: Uses pooled connection over HTTPS; connection limits monitored via Neon dashboard
- **Compatibility Matrix**: All external integrations must be validated via PoC before production deployment (see Section 5 of auth-specification.md)

## 10. Testing and Verification Requirements

| Test Type | Scope | Tools/Frequency | Acceptance Criteria |
|-----------|-------|-----------------|---------------------|
| **Unit Tests** | Individual functions and components | Jest/Vitest; on every commit | 80%+ line coverage; tests for edge cases and error conditions |
| **Integration Tests** | API routes and database interactions | Vitest/Supertest; on every commit | Tests cover auth flows, data validation, and transaction processing |
| **End-to-End (E2E) Tests** | Critical user journeys | Playwright/Cypress; nightly | Covers sign-in, dashboard navigation, filtering, and data export |
| **Authentication Tests** | Clerk integration and role-based access | Custom test suite; on every commit | Verifies 401/403 responses, session validation, and webhook handling |
| **Tenant Isolation Tests** | Cross-tenant data access attempts | Custom test suite; weekly | Confirms no data leakage between organizations; 403 for unauthorized access |
| **Performance Tests** | API response times and resource usage | Artillery/Lighthouse; weekly | 95th percentile API response < 500ms; CPU per request < 50ms |
| **Security Tests** | Vulnerability scanning and penetration testing | npm audit, Snyk; weekly | No high/critical vulnerabilities; dependencies updated regularly |
| **Migration Tests** | Prisma schema changes and data integrity | Test database; on every migration | Schema applies cleanly; seed data preserves referential integrity |
| **Compatibility Tests** | Cloudflare Workers deployment | Separate PoC repository; pre-deployment | Group A tests pass (build, deploy, health check, DB connectivity, auth flows) |
| **Regression Tests** | Feature completeness after changes | Full test suite; pre-release | All existing functionality continues to work as expected |
| **Accessibility Tests** | WCAG AA compliance | axe-core; monthly | No accessibility violations in core UI components |
| **Localization Tests** | EN/AR translation completeness | Manual verification; per release | All UI elements correctly translated and directionally appropriate |

Test environment requirements:
- **Test Database**: Separate Neon project for testing; restored from known state before each test run
- **Test Clerk Instance**: Separate Clerk application for testing; webhook pointed to test API
- **Test Coverage**: Minimum 80% line coverage for unit and integration tests; critical paths >90%
- **Test Data**: Fictional demo data only; no real customer or financial data used in testing
- **Test Isolation**: Each test runs in clean environment; database transactions rolled back after each test
- **Continuous Integration**: GitHub Actions runs all tests on push to main and preview branches
- **Test Reporting**: Results published as PR comments; failures block merge until resolved

## 11. Delivery Phases and Dependency-Aware Implementation Order

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish core infrastructure, authentication, and basic dashboard with demo data
- [ ] Set up Neon PostgreSQL project and obtain DATABASE_URL
- [ ] Configure Prisma schema with initial enums and core tables (Platform, Organization, User, FinancialTransaction, FinancialAccount, OpeningBalance, MonthlyBudget)
- [ ] Generate and apply initial migration
- [ ] Set up Clerk authentication and webhook endpoint
- [ ] Implement middleware for organization and tenant isolation
- [ ] Create basic dashboard layout with responsive design, navigation, and header controls
- [ ] Implement demo data service and fallback mechanism
- [ ] Add localization (EN/AR) and light/dark theme support
- [ ] Create KPI cards, cash flow chart, budget burndown, and transactions table
- [ ] Implement loading, empty, error, and retry states
- [ ] Add accessibility features (keyboard navigation, ARIA labels, focus management)
- [ ] Set up CI/CD pipeline with linting, testing, and build steps
- [ ] Create health check endpoint (/api/health)
- [ ] Implement safe demo-data seeding with environment safeguards
- [ ] Write repository setup instructions and developer documentation

### Phase 2: Core Functionality (Weeks 3-4)
**Goal**: Enable financial transaction management and basic reporting
- [ ] Implement financial transaction CRUD operations with validation
- [ ] Add revenue classification and recognition logic
- [ ] Implement MRR and ARR calculations
- [ ] Add cash flow and financial account balance tracking (illustrative)
- [ ] Implement budget planning and monitoring with overrun alerts
- [ ] Add financial precision (Decimal 19,4) and reconciliation processes
- [ ] Implement input validation and safe error handling
- [ ] Add role-based access control (Admin, Finance, Analyst, Read-only)
- [ ] Create financial reports (Income Statement, Cash Flow Statement, etc.)
- [ ] Add filters, comparisons, and drill-down capabilities
- [ ] Implement security audit trails for authentication and data changes
- [ ] Add session and account security measures (secure cookies, password policies)
- [ ] Implement rate limiting for API abuse prevention
- [ ] Add logging, monitoring, and error reporting
- [ ] Set up database backups and recovery procedures
- [ ] Implement performance monitoring and optimization
- [ ] Add dependency and supply-chain maintenance (npm audit, dependabot)

### Phase 3: Tenant Features (Weeks 5-6)
**Goal**: Enable organization and customer management capabilities
- [ ] Implement organization management (super-admin view to create/manage tenants)
- [ ] Add organization memberships and invitations with role-based access
- [ ] Create A-Group portfolio management section for internal platform tracking
- [ ] Implement customer directory with search and segmentation
- [ ] Add customer segmentation and health indicators (P1 feature)
- [ ] Implement product catalog and subscription plans
- [ ] Add subscription creation and management with lifecycle tracking
- [ ] Implement subscription lifecycle and status transition enforcement
- [ ] Add trials, renewals, and recurring billing rules with retry logic
- [ ] Implement upgrades, downgrades, plan changes, and proration calculations
- [ ] Add cancellation, expiration, and reactivation functionality
- [ ] Implement invoices and billing documents with status tracking
- [ ] Add payment records and payment statuses (simulated)
- [ ] Implement outstanding balances and collections view
- [ ] Add validation, duplicate prevention, and data-quality checks
- [ ] Implement customer and subscription exports (P2 feature)
- [ ] Add payment methods, providers, and reconciliation records (P2 feature)
- [ ] Implement billing history and operational audit trail

### Phase 4: Enhancements and Polish (Weeks 7-8)
**Goal**: Add advanced features, optimize performance, and prepare for release
- [ ] Implement payment channel breakdown visualization
- [ ] Add financial alerts and threshold indicators
- [ ] Implement saved reports and CSV exports with scheduling
- [ ] Add subscription performance analytics (churn rate, LTV, conversion rate)
- [ ] Implement TV/display mode for wall-mounted presentations (P2 feature)
- [ ] Add safe display-mode handling to prevent sensitive data exposure
- [ ] Implement financial access controls and audit trails (P2 feature)
- [ ] Add security incident and recovery readiness procedures (P2 feature)
- [ ] Optimize database queries and add caching where beneficial
- [ ] Conduct performance testing and resource usage optimization
- [ ] Complete production security and release checklist
- [ ] Test deployment rollback and operational recovery procedures
- [ ] Validate free-tier limits and implement cost management strategies
- [ ] Conduct final QA, accessibility, and localization testing
- [ ] Prepare release notes and deployment documentation

### Dependency-Aware Implementation Notes
- **Authentication must precede organization management**: Clerk integration and local user records required before implementing org memberships and invitations
- **Tenant isolation must be implemented early**: Middleware and server-side verification needed before any data-accessing features
- **Financial transaction management depends on core schema**: Prisma models for FinancialTransaction, FinancialAccount, etc. must be in place
- **Subscription features depend on customer and product models**: Customer, Subscription, Invoice, and PaymentRecord models needed for subscription management
- **Reporting features depend on transaction aggregation**: MRR/ARR, cash flow, and financial reports require transaction data and calculation logic
- **Performance optimizations come later**: Caching, query optimization, and resource management implemented after core functionality is working
- **Advanced features build on basics**: TV mode, saved reports, and analytics require foundational dashboard and data access layers
- **Deployment validation must happen early**: Cloudflare Workers compatibility verified via PoC before investing in Workers-specific optimizations

## 12. Risks, Assumptions, and Unresolved Decisions

### Risks
| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Cloudflare Workers Incompatibility** | Medium | High | Execute PoC in separate repository (auth-specification.md); have Vercel fallback plan ready |
| **Prisma Binary Engine Issues on Workers** | Medium | High | Test @prisma/adapter-pg with pg driver if binary engine fails; consider Neon serverless driver directly |
| **Next.js/Turbopack/OpenNext Conflicts** | Medium | Medium | Disable Turbopack in next.config.ts; monitor OpenNext compatibility updates |
| **Clerk Webhook Delivery Delays** | Low | Medium | Implement idempotent handling via upsert; use Clerk's built-in retry mechanism |
| **Neon Connection Pool Exhaustion** | Low | Medium | Monitor connection count via Neon dashboard; implement connection warming if needed |
| **Free-Tier Limit Exceedance** | Medium | Medium | Implement usage alerts at 80% of limits; optimize queries and add caching; plan to upgrade if growth exceeds projections |
| **Data Isolation Failure** | Low | High | Implement server-side organization verification on all API routes; add automated tenant isolation tests |
| **Localization Quality Issues** | Low | Medium | Use professional translation services; involve native speakers in review; implement automated localization testing |
| **Performance Degradation Over Time** | Medium | Medium | Implement performance budgets; monitor key metrics; optimize slow queries; consider caching layer |
| **Dependency Vulnerabilities** | Low | Medium | Use dependabot for automated updates; run npm audit weekly; maintain lockfile; test upgrades in branches |

### Assumptions
| Assumption | Rationale | Validation Required |
|------------|-----------|---------------------|
| **Fictional demo data is sufficient for initial release** | No real customer data available or authorized per constraints | Confirmed in requirements; demo data clearly labeled |
| **LYD and USD can be kept strictly separate** | No exchange-rate process requested in requirements | Verified through currency separation in all models and calculations |
| **Neon PostgreSQL with pooling is compatible with Prisma 5.22.0 on Cloudflare Workers** | Documented compatibility claimed but not tested | Requires PoC validation (see auth-specification.md) |
| **OpenNext + Wrangler can successfully deploy Next.js 16.4.0 to Cloudflare Workers** | Documented compatibility claimed but not tested | Requires PoC validation (see auth-specification.md) |
| **Clerk @clerk/nextjs@^6.0.0 is compatible with Cloudflare Workers** | Documented compatibility claimed but not tested | Requires PoC validation (see auth-specification.md) |
| **GitHub Actions CI/CD will work with the selected deployment stack** | Standard Next.js deployment; used in many projects | Verify through test runs in feature branches |
| **Tailwind CSS ^4 is compatible with Next.js 16.4.0 App Router** | Used in project; follows Next.js CSS guidelines | Verify through visual testing and build success |
| **TypeScript ^5 provides adequate type safety for the project** | Used in project; follows Next.js TypeScript guidelines | Verify through type checking and developer experience |
| **ESLint ^9 with eslint-config-next maintains code quality** | Standard Next.js linting configuration | Verify through linting passes and code reviews |
| **The project can be delivered within the short deadline using a phased approach** | Based on estimated effort for each phase | Monitor progress against phase gates; adjust scope if needed |

### Unresolved Decisions
| Decision | Options | Recommended Approach | Notes |
|----------|---------|----------------------|-------|
| **Deployment Platform** | Cloudflare Workers (with OpenNext) vs Vercel (fallback) | Start with Cloudflare Workers PoC; fallback to Vercel if PoC fails | See auth-specification.md for detailed PoC plan and fallback architecture |
| **Connection Strategy for Neon** | Pooled connection (-pooler) vs direct connection | Use pooled connection for efficient resource usage in serverless | Verified compatibility claimed in auth-specification.md |
| **Clerk Session Storage** | Cookies vs localStorage | Use cookies with Secure and SameSite=Strict for security | Standard Clerk Next.js implementation |
| **Webhook Reliability Mechanism** | Retry logic in app vs relying on Clerk | Rely on Clerk's built-in exponential backoff (1m, 5m, 15m, 1h, 6h, 24h) | Simplifies implementation; Clerk manages retries |
| **Audit Trail Storage** | Database table vs external service | Start with database table (SecurityAudit model); consider external service for scale | Database table sufficient for initial release; can migrate later |
| **Performance Monitoring** | Built-in metrics vs third-party service | Start with console metrics and web vitals; consider Sentry or Datadog for scale | Built-in adequate for initial release; can enhance later |
| **Error Reporting** | Console logging vs external service | Start with console logging; consider Sentry for production error tracking | Console logging sufficient for initial release; can enhance later |
| **Feature Flagging Approach** | Environment variables vs dedicated service | Use environment variables for simple flags; consider LaunchDarkly for complex rollouts | Environment variables adequate for initial release; can enhance later |
| **Internationalization (i18n) Library** | Custom translation files vs i18next | Use custom translation files for simplicity; consider i18next for complex needs | Custom files adequate for two languages; can migrate later |
| **State Management** | React Context vs Redux/Zustand | Use React Context for simple state; consider external library for complex state | Context adequate for initial release; can enhance later |
| **Form Validation** | Custom validation vs React Hook Form/Zod | Use custom validation for simple forms; consider RHF/Zod for complex forms | Custom validation adequate for initial release; can enhance later |
| **Data Visualization Library** | Custom charts vs Chart.js/D3 | Use custom charts for simple visualizations; consider Chart.js/D3 for complex needs | Custom charts adequate for initial release; can enhance later |

## 13. Definition of Done for the Initial Release

The initial release (P0 features complete) is considered done when all of the following conditions are met:

### Functional Completeness
- [ ] All P0 features from Sections 4.1 through 4.5 are implemented and tested
- [ ] Dashboard loads and displays correctly in both English and Arabic
- [ ] Responsive layout works on desktop (≥1024px), tablet (≥768px), and mobile (≥320px) screens
- [ ] Light and dark themes function correctly with proper color contrast
- [ ] Navigation sidebar and header controls (month, currency, language) update all displayed data
- [ ] KPI cards show correct values, currency, and month-over-month change indicators
- [ ] Cash flow chart renders income vs. expenses for current and previous month
- [ ] Budget burndown shows expenses vs. budget cap with color-coded usage indicators
- [ ] Transactions table supports search, status/category/payment method filters, and pagination
- [ ] Loading, empty, error, and retry states are implemented and functional
- [ ] Accessibility features (keyboard navigation, ARIA labels, focus management) are implemented
- [ ] Demo data is clearly labeled as illustrative/sample throughout the UI
- [ ] Organization management allows super-admin to create and manage tenants
- [ ] Organization memberships and invitations work with role-based access (Admin, Finance, Analyst, Read-only)
- [ ] A-Group portfolio management section displays financials for internal platforms
- [ ] Product catalog and subscription plans can be created and managed by tenant admins
- [ ] Subscription creation validates plan details and enforces currency and interval rules
- [ ] Subscription lifecycle status transitions follow allowed paths (active, trial, past_due, canceled)
- [ ] Invoices and billing documents can be generated and tracked (draft, sent, paid, void)
- [ ] Payment records (simulated) are linked to invoices and show provider, amount, date, and status
- [ ] Outstanding balances and collections view shows overdue invoices and expected cash
- [ ] Validation prevents duplicate subscription creation and enforces logical consistency
- [ ] Financial transaction management allows CRUD operations for income/expense entries
- [ ] Revenue classification distinguishes invoiced revenue, collected cash, recognized revenue, and MRR
- [ ] MRR and ARR calculations sum active subscription amounts by currency and tenant
- [ ] Cash flow and financial account balances show illustrative position (opening + net income/expenses)
- [ ] Budget planning and monitoring allows setting monthly expense caps and tracking actual vs. budget
- [ ] Financial precision maintains Decimal (19,4) accuracy for all currency amounts
- [ ] Reconciliation processes ensure transaction integrity between invoices, payments, and account balances
- [ ] Clerk authentication enables users to sign in via email/password or social providers
- [ ] Local user records track isActive status, role, and organization memberships
- [ ] Organization and tenant isolation verified server-side on all API requests
- [ ] Role-based access control enforces permissions (Admin, Finance, Analyst, Read-only)
- [ ] Protected browser pages and API routes require authentication; return 401/403 for unauthorized access
- [ ] Verified Clerk webhook synchronizes user.created, updated, and deleted events
- [ ] Input validation and sanitization prevent injection attacks; error messages avoid stack traces
- [ ] Referential integrity maintained through foreign key constraints and transactional operations
- [ ] Security audit trails log authentication events, permission changes, and data access
- [ ] Session and account security implemented (secure cookies, password policies, brute-force protection)
- [ ] Rate limiting prevents API abuse; exceeded limits return 429 with retry-after header
- [ ] Secret management uses environment variables only; no .env files committed
- [ ] Authentication, authorization, and tenant-isolation tests pass in CI
- [ ] Deployment architecture validated through PoC in separate repository (Group A tests pass)
- [ ] Neon PostgreSQL configured with connection pooling and proper connection string
- [ ] Prisma schema and migrations are version-controlled and applied via CI/CD
- [ ] Environment configuration separates development, preview, and production; secrets injected at runtime
- [ ] Cloudflare deployment via OpenNext and Wrangler verified in PoC (worker.js size, cold-start readiness)
- [ ] CI/CD pipeline runs linting, testing, building, and deployment to preview/production
- [ ] Health check endpoint returns database connectivity, version, and timestamp
- [ ] Logging, monitoring, and error reporting implemented (structured logs, error tracking)
- [ ] Database backups configured and recovery procedures documented
- [ ] Performance monitoring tracks response times and resource usage
- [ ] Dependency and supply-chain maintenance performed (npm audit, dependabot)
- [ ] Safe demo-data seeding uses upsert to avoid duplicates; runs only in non-production environments
- [ ] Repository setup instructions, README, and developer documentation are complete and accurate
- [ ] Production security and release checklist completed and signed off
- [ ] Deployment rollback and operational recovery procedures tested and documented
- [ ] Free-tier limits monitored and cost management strategies implemented

### Quality Standards
- [ ] Code follows established formatting and linting rules (no ESLint errors)
- [ ] TypeScript compiles without errors (no tsc errors)
- [ ] All new code is covered by unit or integration tests (minimum 80% line coverage)
- [ ] Critical paths have test coverage >90%
- [ ] Security vulnerabilities addressed (no high/critical npm audit findings)
- [ ] Performance budgets met (95th percentile API response < 500ms; CPU per request < 50ms)
- [ ] Accessibility compliant (WCAG AA for color contrast, keyboard navigation, screen-reader support)
- [ ] Localization complete (all UI elements translated correctly in EN and AR)
- [ ] Documentation accurate (README, contributing guide, architecture overview)
- [ ] Demo data clearly labeled and distinguishable from real data
- [ ] No real customer or financial data used or stored
- [ ] Secrets never exposed in logs, client-side code, or commit history

### Release Criteria
- [ ] All P0 features implemented and tested
- [ ] No known critical bugs or security vulnerabilities
- [ ] Performance within defined thresholds
- [ ] Accessibility and localization requirements met
- [ ] Documentation complete and accurate
- [ ] Release approved by development, security, and product leads
- [ ] Rollback plan tested and documented
- [ ] Communication plan prepared for release announcement
- [ ] Post-release monitoring and support plan in place

## 14. Deferred Features that Must Remain on the Roadmap

The following features are intentionally deferred but must remain on the roadmap for future implementation:

### Deferred P1 Features
- **Payment Channel Breakdown**: Visualization of income/expenses by payment method (requires payment method data in transactions)
- **Customer Directory**: Searchable list of a tenant's customers with contact info and segmentation tags
- **Customer Segmentation & Health Indicators**: Tags (e.g., Enterprise, SMB) and health scores based on payment history, login frequency, etc.
- **Trials, Renewals, & Recurring Billing Rules**: Automatic trial conversion, renewal attempts, and retry logic for failed payments
- **Upgrades, Downgrades, Plan Changes, & Proration**: Mid-cycle plan changes with credit/refund for unused portion
- **Cancellation, Expiration, & Reactivation**: Options to cancel immediately or at period end; expired subscriptions can be reactivated
- **Payment Methods, Providers, & Reconciliation Records**: Simulated payment methods (cash, card, bank transfer) and providers; reconciliation against bank statements
- **Billing History & Operational Audit Trail**: Immutable log of all billing-related actions (invoice created, payment attempted, subscription changed)
- **Customer & Subscription Exports**: CSV export of customer list and subscription details for reporting or migration
- **Financial Reports**: Standard reports: Income Statement, Cash Flow Statement, Subscription Revenue Report, Aging Receivables
- **Filters, Comparisons, & Drill-Down**: Ability to compare periods (MoM, YoY), filter by platform/category, and drill from summary to transactions
- **Subscription Performance Analytics**: Metrics like churn rate, LTV, conversion rate, and average revenue per user (ARPU) per tenant
- **Financial Alerts & Threshold Indicators**: Configurable alerts for low cash, high expenses, failed payment spikes, or budget overruns
- **Security Audit Trails**: Immutable log of authentication events (login/logout/failure), permission changes, and data access for compliance
- **Session & Account Security**: Secure session settings; password policies; brute-force protection; session rotation on sensitive actions
- **Rate Limiting & Abuse Resistance**: Limit API requests per IP/user to prevent scraping and DoS; distinguish between burst and sustained traffic
- **Logging, Monitoring, & Error Reporting**: Structured logging to stdout; error tracking via Sentry or similar; performance monitoring via web vitals
- **Database Backups & Recovery**: Automated daily backups of Neon database; point-in-time recovery (PITR) capability; restore procedures documented
- **Performance & Resource Management**: Monitor response times, CPU usage, and memory leaks; optimize queries and add caching where beneficial
- [ ] Production Security & Release Checklist: Pre-deployment checklist: secret verification, migration review, backup confirmation, smoke test in preview
- [ ] Deployment Rollback & Operational Recovery: Ability to revert to previous deployment via platform rollback feature; hotfix branches for critical patches
- [ ] Free-Tier Limits, Cost Management, & Resource Constraints: Monitor usage against free tiers of Workers (100k req/day, 30s CPU/day), Clerk (10k MAU), Neon (0.5GB storage, 190 compute hrs/mo); optimize to stay within limits

### Deferred P2 Features
- **TV/Display Mode**: Read-only presentation for wall-mounted displays: auto-rotating sections, configurable refresh, pause/resume, stale-data warnings, reduced motion
- **Safe Display-Mode Handling**: Ensures no sensitive data (e.g., PII, detailed transaction notes) appears in TV mode
- **Saved Reports & CSV Exports**: Save report configurations with filters and schedule email delivery; export to CSV for external analysis
- **Subscription Performance Analytics**: Metrics like churn rate, LTV, conversion rate, and average revenue per user (ARPU) per tenant (also listed in P1; appears in both)
- **Financial Access Controls, Audit Trails, & Operational Boundaries**: Role-based access to financial data (e.g., Finance sees all, Analyst sees reports only, Read-only sees dashboards)
- **Security Incident & Recovery Readiness**: Playbook for suspected breaches; steps to revoke sessions, rotate secrets, and restore from backups

All deferred features are preserved in this document and must be implemented in future releases following the priority classifications and dependency guidelines outlined above. No deferred features have been silently removed from the requirements.

