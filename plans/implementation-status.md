# Implementation status

Updated 2026-10-15.

## Done
- Neon database, tenant-scoped data, Clerk auth on every page and API route, roles and permissions enforced on the API.
- Overview shows USD (left) and LYD (right) side by side; each has financial position, month spending (spent so far, still to pay, expected total by month end vs budget), KPIs, charts, comparisons.
- Server-side search / filter / sort / pagination for customers, subscriptions, invoices, transactions, audit log; billing and finance numbers are SQL aggregates (no row loading), verified equal to the reference calculations.
- Write workflows (all validated, audited, atomic): customers (add, edit, deactivate), subscriptions (add, pause, resume, cancel), invoices (issue, void), simulated payments, transactions (add, edit, delete), budgets, plans / products, users (role, activate / deactivate).
- Audit log (admin), CSV exports, toasts, bilingual forms, mobile bottom-sheet dialogs.
- Deterministic 2,000-customer synthetic dataset generator + validator + guarded database writer.
- Cloudflare Workers deployment, CI and deploy workflows.

## Pending the owner's approval (database changes)
- Apply migration `20261015120000_audit_log` (adds the `AuditLog` table) to Neon.
- Run the demo-scale seed against Neon, then verify the UI on the generated data and redeploy.

## Not done / risks
- Signed-in flows on the deployed Worker are not automated (needs a real Clerk session).
- Free-plan Worker CPU limit (10 ms per request) may be tight; watch the observability logs.
- No Arabic name field exists on customers (the Arabic name is kept in the notes); adding `displayNameAr` needs a migration.
- Partial payments, TV mode, real payment processing: out of scope.
