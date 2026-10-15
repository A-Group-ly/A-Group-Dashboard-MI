# Category 3: Finance, Analytics & Reporting

## Objective

Create a reliable financial and analytics system for the A-Group Subscription Dashboard. It must provide traceable financial calculations, consistent subscription metrics, cash-flow visibility, budget monitoring, management reports, and controlled exports.

This category depends on Category 1 (Dashboard Experience & Interface), Category 2 (Organizations, Customers & Subscription Operations), Category 4 (Authentication, Permissions & Data Integrity), and Category 5 (Infrastructure, Deployment & Product Reliability).

This document defines the complete scope. Features may be implemented in phases, but no feature may be silently removed from the product scope.

## Global financial rules

1. Store monetary values using appropriate database decimal types and explicit precision rules. Avoid careless floating-point arithmetic for financial calculations.
2. Keep LYD and USD separate. Never add, compare, or present different currencies as one total unless an explicit conversion process, exchange rate, rate date, and conversion policy are defined.
3. Distinguish invoiced revenue, collected revenue, recognized revenue, recurring revenue, expenses, and cash movement.
4. Define every financial and subscription metric, including its formula, reporting period, inclusion criteria, exclusions, and denominator where applicable.
5. Every displayed total must be traceable to its source records.
6. Prevent duplicate financial events and duplicate counting across invoices, payments, transactions, refunds, and subscription records.
7. Preserve financial history. Corrections must be traceable and must not silently erase historical activity.
8. Enforce organization-level data isolation in every query, calculation, report, drill-down, and export.
9. Label demo and simulated records clearly. Never represent demo figures as actual A-Group or customer financial results.
10. No real payment processing, charging, refunds, or money movement is authorized by this category.
11. Missing, incomplete, stale, or inconsistent data must be disclosed rather than silently replaced with invented values.
12. Dashboard cards, analytics pages, reports, and CSV exports must use consistent calculation rules.

---

## Feature 1: Financial Transaction Management

### What it must do
- Record income, expenses, refunds, reversals, adjustments, and approved transfer types.
- Store transaction identifier, organization, transaction date, amount, currency, category, description, account, status, and relevant relationships.
- Link transactions to invoices, payment records, subscriptions, customers, or financial accounts when applicable.
- Support search, sorting, pagination, date filters, currency filters, status filters, and category filters.
- Support authorized creation, review, correction, and export workflows.
- Clearly distinguish actual transactions from planned or simulated entries.
- Maintain traceability from financial summaries to individual records.

### What it must not do
- Count the same financial event twice.
- Treat an issued invoice as proof that money was collected.
- Treat a subscription record as proof that a payment succeeded.
- Silently delete or overwrite historical financial records.
- Allow invalid amounts, currencies, statuses, or organization relationships.
- Claim to connect to a bank or payment provider unless that integration exists and has been verified.

### How to implement
- Inspect existing Prisma models before proposing new models.
- Define transaction types, statuses, relationships, and currency precision.
- Establish an authoritative service for creating and validating financial transactions.
- Use database transactions when a single business operation updates multiple related records.
- Add duplicate-event prevention where repeated requests or provider events could create duplicate entries.
- Apply server-side organization and permission checks.
- Add unit and integration tests for transaction creation, correction, filtering, relationships, and duplicate prevention.

### Acceptance criteria
- Every transaction belongs to the correct organization and has a valid currency and amount.
- Related records do not cause duplicate financial totals.
- Authorized users can trace summary values to transaction details.
- Unauthorized users cannot access or export another organization's transactions.

---

## Feature 2: Revenue Classification and Recognition

### What it must do
- Distinguish at least:
  - Invoiced revenue: amounts invoiced during the selected reporting period.
  - Collected revenue: amounts successfully received and recorded during the selected period.
  - Recognized revenue: amounts recognized according to an explicitly defined recognition policy, if that policy is implemented.
  - Outstanding receivables: amounts still due and unpaid.
  - Refunded amounts: amounts recorded as refunded or reversed.
  - Recurring revenue: revenue eligible for MRR/ARR calculations.
  - One-time revenue: revenue not classified as recurring.
- Provide clear reporting-period rules for each metric.
- Document the effect of discounts, refunds, taxes, credits, partial payments, and failed payments.
- Identify metrics that cannot yet be calculated reliably because required data is unavailable.

### What it must not do
- Present invoiced revenue as collected revenue.
- Present collected revenue as recognized revenue without a defined policy.
- Count failed or pending payments as successful collections.
- Treat refunds as ordinary positive revenue.
- Assume tax treatment or formal accounting rules without an approved policy.
- Present estimated or incomplete figures as audited accounting results.

### How to implement
- Define revenue classification and calculation rules in a shared server-side module.
- Identify the authoritative source for each metric and avoid duplicate counting between related records.
- Document how invoice dates, payment dates, refund dates, and recognition dates affect reporting.
- Make unavailable metrics explicitly unavailable instead of fabricating results.
- Test partial payments, failed payments, refunds, credits, and date-boundary behavior.

### Acceptance criteria
- Each revenue metric has a documented formula and source.
- Equivalent filters produce consistent results across the dashboard and reports.
- The UI labels invoiced, collected, and recognized revenue distinctly.

---

## Feature 3: Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR)

### What it must do
- Calculate MRR from eligible recurring subscriptions according to a documented policy.
- Calculate ARR from eligible recurring revenue using a documented annualization rule.
- Report new MRR, expansion MRR, contraction MRR, and churned MRR.
- Support breakdowns by organization, product, plan, subscription status, reporting period, and currency where relevant.
- Show trends and period-over-period changes.
- Allow authorized users to drill down from aggregate metrics to the subscriptions contributing to the result.
- Identify which subscription statuses and billing conditions are included in calculations.

### Required definitions
- MRR must represent normalized recurring subscription value for a defined point in time or period.
- ARR must follow a consistent documented annualization rule. It must not be described as cash collected over a year.
- New MRR, expansion MRR, contraction MRR, and churned MRR must have mutually understandable definitions and consistent period boundaries.
- Trials, discounts, pauses, past-due states, canceled subscriptions, annual billing intervals, and partial periods must be explicitly addressed.

### What it must not do
- Include one-time charges as recurring revenue.
- Count the same subscription more than once.
- Treat ARR as guaranteed future revenue or actual cash received.
- Include ineligible subscriptions without disclosing the policy.
- Combine MRR across currencies without explicit conversion.
- Change formulas between different screens.

### How to implement
- Build shared, tested server-side calculation functions.
- Use the subscription and plan records defined in Category 2.
- Store or derive recurring prices consistently, accounting for billing intervals and documented discount rules.
- Make reporting dates, time zones, and status eligibility explicit.
- Add tests for monthly and annual plans, trials, upgrades, downgrades, cancellations, discounts, pauses, and zero eligible subscriptions.

### Acceptance criteria
- MRR and ARR are reproducible from the underlying eligible subscription records.
- Dashboard cards, charts, drill-downs, and reports agree.
- Formula documentation is available to developers and understandable to finance users.

---

## Feature 4: Cash Flow and Financial Account Balances

### What it must do
- Display opening balances, incoming cash, outgoing cash, transfers where applicable, adjustments, and closing balances.
- Show balances by financial account and currency.
- Distinguish actual recorded cash movements from unpaid invoices, forecast receipts, planned expenses, and upcoming obligations.
- Provide historical cash-flow reports and forward-looking views only when sufficient data exists.
- Reconcile calculated balances with opening balances and recorded movements.
- Flag discrepancies, missing opening balances, and incomplete transaction data.

### What it must not do
- Count an unpaid invoice as available cash.
- Treat budgets, subscription value, or projected revenue as a bank balance.
- Mix currencies into a single balance without an explicit conversion policy.
- Claim a balance is reconciled if the supporting records are incomplete.
- Claim to show real bank balances without a verified bank integration or approved data source.

### How to implement
- Inspect existing `FinancialAccount`, `OpeningBalance`, and `FinancialTransaction` models before changing the schema.
- Define the exact effect of each transaction type on account balances.
- Document the treatment of transfers, refunds, reversals, and corrections.
- Calculate balances consistently on the server.
- Add reconciliation checks and tests for opening balances, transactions, transfers, and reporting-period boundaries.

### Acceptance criteria
- Account balances are reproducible from the opening balance and eligible recorded movements.
- Unpaid receivables and planned expenses are displayed separately from actual cash movements.
- Missing or inconsistent source data is clearly flagged.

---

## Feature 5: Budget Planning and Monitoring

### What it must do
- Create and manage budgets by period, category, organization, product, or other approved reporting dimension.
- Support monthly budgets and a documented approach to other reporting periods.
- Compare budgeted amounts with actual eligible expenses.
- Show budget amount, actual spending, remaining budget, utilization percentage, and over-budget status.
- Support filtering by date range, category, organization, and currency.
- Show spending trends and configurable warning thresholds.
- Preserve prior-period results and changes to budget definitions.
- Distinguish actual expenses from planned or forecast expenses.

### What it must not do
- Count planned or unpaid expenses as actual cash outflows without clear labeling.
- Compare budgets and expenses in different currencies as though they were equivalent.
- Rewrite historical actual spending when a budget is changed.
- Divide by zero when a budget is zero.
- Generate alerts based on duplicate or invalid transactions.
- Treat a budget as a cash balance.

### How to implement
- Inspect the existing `MonthlyBudget` model and document any required changes.
- Define budget periods, categories, currencies, organization ownership, and update permissions.
- Calculate actual spending using the authoritative transaction rules from this category.
- Store budget change history or an equivalent auditable revision mechanism.
- Define zero-budget behavior and utilization rules.
- Test under-budget, over-budget, zero-budget, missing-data, and reporting-period scenarios.

### Acceptance criteria
- Budget totals and actual spending use compatible currencies and periods.
- Budget changes do not erase actual financial history.
- Threshold warnings are reproducible and traceable.

---

## Feature 6: Subscription Performance Analytics

### What it must do
- Report active subscriptions, new subscriptions, renewals, cancellations, expirations, and subscription growth.
- Provide churn and retention analytics with explicit definitions.
- Support cohorts based on subscription start date or another documented cohort definition.
- Track collection rates, failed payments, overdue invoices, and recovery outcomes where the data exists.
- Calculate customer lifetime value (CLV) only with a documented method and sufficient source data.
- Separate observed historical metrics from estimates and forecasts.
- Provide breakdowns by organization, product, plan, billing interval, and reporting period where useful.
- Support trend analysis without changing definitions between views.

### What it must not do
- Change churn or retention definitions between pages.
- Treat missing records as zero without identifying that assumption.
- Present estimated CLV as verified financial fact.
- Count demo records as actual business performance.
- Treat a failed payment as a canceled subscription unless the lifecycle rules explicitly say so.
- Claim predictive accuracy without a validated prediction method.

### How to implement
- Define each metric's formula, eligible population, date window, and denominator.
- Use subscription lifecycle rules from Category 2.
- Reuse shared server-side calculation functions.
- Identify when insufficient data makes a metric unavailable or unreliable.
- Add tests for empty cohorts, zero starting customers, renewals, refunds, cancellations, and failed payments.

### Acceptance criteria
- Every analytic metric has a documented formula.
- Actual, estimated, and unavailable values are distinguishable.
- Results are consistent across filters and reports.

---

## Feature 7: Financial Reports

### What it must do
- Provide monthly and quarterly summaries for:
  - Invoiced, collected, and recognized revenue where supported.
  - Expenses and net results under a documented definition.
  - Cash flow and financial account balances.
  - Budget versus actual spending.
  - Outstanding receivables, overdue invoices, and collection activity.
  - MRR, ARR, subscription growth, churn, and retention.
  - Revenue by organization, product, and plan.
- Show the selected reporting period, organization scope, filters, currency, and data freshness.
- Provide detail tables and drill-downs for supported summary values.
- Support print-friendly layouts.
- Make reports consistent with the dashboard and underlying source records.

### What it must not do
- Present conflicting totals for equivalent filters without an explanation.
- Hide reporting assumptions, exclusions, or applied filters.
- Expose records from other organizations.
- Label a management summary as a formal accounting statement unless it meets applicable accounting and approval requirements.
- Show fabricated values for unsupported reports.

### How to implement
- Build reusable server-side report queries and shared calculation services.
- Validate reporting parameters and enforce permissions before accessing data.
- Define period boundaries and currency behavior consistently.
- Use common metric definitions across dashboard cards, reports, and exports.
- Test report totals against independently calculated source-record totals.

### Acceptance criteria
- Equivalent filters produce equivalent totals across dashboard and report views.
- Reports clearly disclose period, currency, organization scope, and relevant limitations.
- Unauthorized users cannot access restricted report data.

---

## Feature 8: Filters, Comparisons and Drill-Down

### What it must do
- Support relevant filters such as date range, organization, product, plan, transaction type, category, status, and currency.
- Provide period comparisons such as current month versus previous month and equivalent previous periods.
- Preserve the selected filters when moving from a summary to a chart, detail table, or record view.
- Let authorized users inspect the source records contributing to supported metrics.
- Provide clear empty states when no records match.
- Show when data is incomplete or stale.

### What it must not do
- Apply different hidden filters to related KPIs.
- Allow drill-down routes or API parameters to bypass organization-level permissions.
- Present an aggregate that cannot be traced to supported source data.
- Change date boundaries or currency rules silently.
- Load unlimited records into the browser for filtering.

### How to implement
- Define validated shared filter parameters.
- Perform authorization, aggregation, sorting, and pagination server-side where appropriate.
- Reuse filter definitions across charts, tables, reports, and exports.
- Add tests verifying that changing a filter updates all dependent metrics consistently.
- Test cross-organization access attempts and manipulated query parameters.

### Acceptance criteria
- Filters have consistent meanings across views.
- Drill-down results reconcile to their parent aggregate within documented rounding rules.
- Unauthorized data remains inaccessible even when users modify URLs or API parameters.

---

## Feature 9: Financial Data Quality, Precision and Reconciliation

### What it must do
- Validate transaction amounts, currency codes, dates, statuses, and record relationships.
- Use appropriate decimal storage and explicit rounding rules.
- Prevent duplicate processing of financial events.
- Preserve a traceable history of corrections and reversals.
- Identify missing, conflicting, or inconsistent records that affect calculations.
- Provide reconciliation checks between payments, invoices, financial transactions, and account balances where those relationships are supported.
- Ensure repeated calculations with the same source data and parameters produce the same results.

### What it must not do
- Use imprecise floating-point arithmetic for authoritative monetary storage and calculations without an explicitly justified design.
- Silently alter financial records to make totals appear consistent.
- Invent missing amounts, exchange rates, transaction statuses, or source records.
- Treat a successful API response as proof that a financial event occurred.
- Allow unauthorized users to change or inspect another organization's financial records.

### How to implement
- Use PostgreSQL decimal types and explicit application-level monetary handling.
- Add database constraints and service-layer validation.
- Use idempotency protections for repeated financial-event processing where applicable.
- Record correction metadata, reason, actor, and timestamp where supported by the audit design.
- Create automated tests for rounding, duplicate events, reversals, invalid relationships, currency separation, and organization isolation.
- Document known limitations and reconciliation assumptions.

### Acceptance criteria
- Financial calculations are deterministic and reproducible.
- Corrections remain traceable.
- Duplicate processing cannot silently inflate financial totals.
- Inconsistencies are visible rather than silently concealed.

---

## Feature 10: Saved Reports and CSV Exports

### What it must do
- Allow authorized users to save useful report configurations, including filters, date ranges, and selected dimensions.
- Reopen saved configurations without silently changing their meaning.
- Export authorized transaction, customer, subscription, budget, and financial report data to CSV where appropriate.
- Apply the same organization scope, filters, and permissions to exports as to displayed results.
- Include meaningful column names and relevant reporting context such as date range and currency.
- Support large datasets through controlled server-side export processing.
- Clearly indicate whether an export completed successfully.

### What it must not do
- Export records the user cannot view.
- Include secrets, authentication tokens, or unnecessary sensitive customer information.
- Present a partial export as a complete result.
- Execute user-controlled spreadsheet formulas unintentionally when exported values are opened in spreadsheet software.
- Claim CSV is equivalent to a formal accounting document or signed financial statement.
- Allow saved report settings to bypass current permissions.

### How to implement
- Store saved report configurations separately from generated report output.
- Validate saved filters when they are created and when they are used.
- Enforce authorization on every export request.
- Use consistent CSV encoding, date formatting, currency representation, and safe handling of formula-like cell values.
- Add tests for permissions, filter consistency, pagination or export limits, and row counts.

### Acceptance criteria
- Exported rows match the authorized filtered dataset.
- CSV output is correctly formatted and does not unintentionally execute spreadsheet formulas.
- Saved reports remain subject to current permissions and organization membership.

---

## Feature 11: Financial Alerts and Threshold Signals

### What it must do
- Provide data-backed signals for budget thresholds, overdue invoices, failed payments, unusual changes, and missing reconciliation data where supported.
- Show the reason for each alert and the relevant period or source records.
- Support dismissal or acknowledgement only where the user's permissions allow it.
- Integrate with Category 1's dashboard alerts and Category 2's subscription and billing records.
- Distinguish actual events from predictions or heuristics.

### What it must not do
- Present an unvalidated anomaly score as a proven fraud finding.
- Create duplicate alerts for the same underlying event without a documented reason.
- send external emails, initiate payments, or trigger financial actions unless separately authorized and implemented.
- Expose another organization's records through alert details.
- Create false alerts from demo data without labeling them.

### How to implement
- Define each alert's trigger, threshold, severity, deduplication key, and lifecycle.
- Evaluate alerts using validated financial and billing data.
- Apply organization scope and permissions to alert creation and display.
- Test threshold boundaries, duplicate suppression, and missing data.

### Acceptance criteria
- Alerts have traceable causes and consistent severity rules.
- Repeated processing does not create uncontrolled duplicate alerts.
- No alert initiates unauthorized money movement or external communication.

---

## Feature 12: Financial Data Access, Audit and Operational Boundaries

### What it must do
- Respect the authentication and role model defined in Category 4.
- Restrict financial changes and exports to authorized roles.
- Record important financial changes and privileged operations in an auditable way.
- Keep all calculations and access checks on trusted server-side paths.
- Work with Category 5's deployment, logging, error handling, and database reliability requirements.
- Make demo mode and data freshness visible to users.

### What it must not do
- Depend solely on hidden buttons or client-side checks for authorization.
- expose sensitive financial information in public endpoints, logs, or error messages.
- treat unauthenticated API access as acceptable because the interface hides the data.
- log secrets, database URLs, or authentication tokens.
- permit cross-organization data access through report or export endpoints.

### How to implement
- Coordinate with Category 4 before implementing financial write permissions.
- Apply server-side authorization and tenant scoping to every financial API and query.
- Use structured logging that excludes secrets and unnecessary sensitive fields.
- Add authorization, audit, and tenant-isolation integration tests.
- Coordinate deployment and environment requirements with Category 5.

### Acceptance criteria
- Financial endpoints enforce authentication, permissions, and organization scope.
- Important changes can be traced to authorized actors where applicable.
- Sensitive values are not exposed in application logs or error responses.

---

## Cross-feature dependencies

- **Category 1 — Dashboard Experience & Interface:** KPI cards, charts, filters, loading and error states, refresh status, drill-down navigation, and responsive reporting layouts.
- **Category 2 — Organizations, Customers & Subscription Operations:** organizations, products, plans, subscriptions, invoices, payment records, financial accounts, opening balances, and transaction relationships.
- **Category 4 — Authentication, Permissions & Data Integrity:** Clerk authentication, server-side authorization, role checks, organization membership, tenant isolation, and audit requirements.
- **Category 5 — Infrastructure, Deployment & Product Reliability:** PostgreSQL and Prisma reliability, environment configuration, migrations, deployment, logging, monitoring, backups, and operational recovery.

Do not duplicate these categories' responsibilities. Define the integration points and report any conflicting assumptions.

## Implementation phases

### Phase 1 — Financial definitions and integrity
- Document metric definitions and currency rules.
- Inspect existing models and identify schema gaps.
- Establish transaction integrity, monetary precision, and source-of-truth rules.
- Add core validation and tests.

### Phase 2 — Core financial calculations
- Implement revenue classifications.
- Implement MRR and ARR.
- Implement cash flow and account balances.
- Implement budgets versus actuals.
- Verify reconciliation and reporting-period rules.

### Phase 3 — Subscription analytics
- Implement subscription growth, churn, retention, collection metrics, and supported CLV.
- Document all formulas and eligibility criteria.
- Add tests for edge cases and insufficient data.

### Phase 4 — Reports and analysis
- Implement standard financial reports, comparisons, filters, and drill-downs.
- Reconcile dashboard metrics against report totals.
- Enforce tenant scope in all report queries.

### Phase 5 — Exports and advanced workflows
- Implement saved report configurations and safe CSV exports.
- Add financial alerts and threshold signals.
- Add advanced cohorts and additional analysis after their data requirements are validated.

These phases control implementation order only. All required features must remain documented in the scope.

## Definition of done

Category 3 is complete only when:

- [ ] Every metric has a documented formula, source, period, and eligibility policy.
- [ ] Invoiced, collected, recognized, recurring, and one-time revenue are distinct.
- [ ] MRR and ARR are calculated consistently across cards, charts, and reports.
- [ ] LYD and USD remain separate unless an explicit conversion policy is implemented.
- [ ] Cash balances reconcile to opening balances and eligible recorded movements.
- [ ] Budget actuals use correctly classified transactions.
- [ ] Reports match dashboard metrics under equivalent filters.
- [ ] Drill-downs reconcile to their parent aggregates within documented rounding rules.
- [ ] Tenant isolation and role permissions are enforced for queries, reports, and exports.
- [ ] CSV exports are authorized, complete, consistently formatted, and safely escaped.
- [ ] Duplicate events cannot silently inflate financial totals.
- [ ] Financial corrections preserve traceable history.
- [ ] Automated tests cover normal scenarios, edge cases, authorization, and data integrity.
- [ ] Demo records are clearly labeled and never presented as real financial performance.
- [ ] No real payment processing or money movement has been introduced without separate explicit authorization.

## Instructions for this documentation task

First inspect `plans/product-scope.md`, the Category 1 and Category 2 specification files, and the existing Prisma schema. If an expected file is missing, report it rather than inventing its contents.

Create or update only `plans/category-3-finance-analytics-reporting.md`.

Do not implement features, modify application code, change the database schema, run migrations, alter dependencies, commit, or push.

When finished, report:
1. The exact file created or updated.
2. The sections and features documented.
3. Any conflicts with existing specifications or schema.
4. Any missing prerequisites or unresolved decisions.
5. Confirmation that no application code or database changes were made.