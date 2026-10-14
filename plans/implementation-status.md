# Implementation status

Updated 2026-10-15.

## Done
- Neon database: tenancy, roles, customers, products, plans, subscriptions, invoices, simulated payments, finance tables; migrated and seeded with fictional data.
- All pages and APIs read from the database (tenant-scoped, aggregated in SQL). No mock data in the app.
- Clerk authentication: every page and API route protected (proxy + per-route check, fails closed); webhook with signature verification.
- Roles ADMIN / FINANCE / ANALYST / READ_ONLY enforced on the API; role shown informationally in the account menu; admin user management.
- Period filters (day/week/month/quarter/half/custom) with automatic previous-period comparison; line, bar and donut charts; financial position (paid, outstanding, expected by month end) first on the overview.
- EN/AR with RTL, brand name stays Latin, light/dark, mobile layouts, hover transitions, CSV export, monthly report.
- Cloudflare Workers deployment (OpenNext), CI (PR checks) and deploy workflows, README, `.env.example`.
- Unit tests: 23 (periods, billing, permissions, dev harness gating, csv, mapping).

## Needs the owner
- Sign in once (first user becomes ADMIN); restrict sign-up in Clerk; register the Clerk webhook at `/api/webhooks/clerk`; allow the Worker URL in Clerk.
- Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Provide the official logo SVG and A-Market / A-Space brand colours.

## Not done / risks
- Signed-in flows on the deployed Worker were not exercised by automation (needs a real Clerk session).
- Free-plan Worker CPU limit (10 ms per request) may be tight; watch `observability` logs.
- Create/edit workflows, TV mode, real payment processing: out of scope.
