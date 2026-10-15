# A-Group Subscription & Financial Dashboard

Bilingual (EN / AR, RTL) executive dashboard for A-Group Holding. Next.js 16 (App Router), React 19, TypeScript,
Tailwind 4, Prisma 5 on Neon PostgreSQL, Clerk authentication, deployed to Cloudflare Workers (OpenNext).

> **All data is fictional demo data** stored in the demo database. No real customer data, no real payments
> (payments are simulated records). Free tiers only.

## What it does

- **Financial overview first:** total paid, outstanding debts, and payments expected by the end of the current month,
  then KPIs, line / bar / donut charts (trend, compare, mix), payment channels, budget burn-down, transactions.
- **Period filters:** daily, weekly, monthly, quarterly, semi-annual or custom range, always compared with the
  equivalent previous period. LYD and USD are never added together.
- **Customers, subscriptions, invoices, simulated payments, reports, alerts**, all read from the database.
- **Roles & permissions:** `ADMIN`, `FINANCE`, `ANALYST`, `READ_ONLY` (matrix in `src/lib/permissions.ts`), enforced on
  every API route (pages hide what a role cannot use, but the API is the real gate).
- Light/dark theme, English/Arabic with RTL (the brand name "A-Group" stays Latin in Arabic), mobile friendly,
  CSV export, printable monthly report.

## Working features (beyond reading)

Add / edit / deactivate customers, start / pause / resume / cancel subscriptions, create plans and products (admin),
issue and void invoices, record **simulated** payments (books the matching income transaction atomically), add / edit /
delete transactions, set monthly budgets, activate / deactivate users, CSV export of customers / subscriptions /
invoices / transactions (server-side, same filters as the table), server-side search / filter / sort / pagination for
large lists, an admin **audit log** of every change, toast feedback and validated forms (English / Arabic).
USD and LYD are always shown side by side (USD left, LYD right) and never combined.

## Quality-of-life features

Global search (Ctrl/Cmd+K or `/`) over customers, subscriptions, invoices and pages; keyboard shortcuts (`?` lists them,
`g` then `o/c/s/i/t/b/r/a/v` jumps to a page); notification bell with the number of urgent items; business-pulse strip
(customers, subscriptions, MRR per currency); action center and recent-activity feed; **TV mode** (`/tv`, rotating
wallboard with auto refresh, hide-amounts privacy toggle and full screen); saved views (period + platform); customizable
overview (show/hide sections); compact/comfortable density; rows-per-page selector; copy buttons for ids, emails and
invoice numbers; customer health badge, lifetime summary and activity timeline; simulated payment reminders for overdue
invoices (recorded in the audit log, nothing is sent); empty-state call-to-action buttons.

## Roles

| Role | Can view |
|---|---|
| READ_ONLY | Overview, settings |
| ANALYST | + transactions, budgets, reports, CSV export (view only) |
| FINANCE | + customers, subscriptions, invoices, alerts, and all create / edit / record-payment actions |
| ADMIN | + organizations, plan catalog, user management, audit log |

The **first user to sign in becomes ADMIN**; everyone after starts as READ_ONLY. An admin changes roles in
Settings → Users. The last admin cannot be demoted.

## Local setup

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env.local       # fill in Neon + Clerk values (never commit them)
cp .env.local .env               # the Prisma CLI reads .env only
npx prisma migrate deploy        # create tables on a NON-production database
npx prisma db seed               # fictional demo data (idempotent; refused when NODE_ENV=production)
npm run dev                      # http://localhost:3000
```

Environment variable names are listed in `.env.example` (placeholders only). Secrets are never in the code.

## Synthetic demo dataset (2,000 customers)

Deterministic and fictional (fixed seed, reserved `example.com` emails, non-assignable phone block, clearly labelled).
Segments: 1,200 individual, 500 small business, 200 medium, 80 enterprise, 20 public-sector demonstration entities.
No new models are needed; it reuses the existing customers, organizations, subscriptions, invoices, simulated payments
and financial transactions.

```bash
npm run demo:validate                       # offline check: counts, foreign keys, reconciliation (no database)
npm run demo:scale                          # dry run against your .env database: writes nothing
npm run demo:scale -- --confirm             # additive, idempotent write (never modifies or deletes existing rows)
ALLOW_DEMO_RESET=true npm run demo:scale -- --reset-demo --confirm   # removes only "-demo-" rows, then rewrites
```

Run `npx prisma migrate deploy` first (adds the audit-log table) and the base seed (`npx prisma db seed`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `npm run typecheck` / `npm test` | Quality checks (CI runs all three) |
| `npm run build:cf` | OpenNext build for Cloudflare |
| `npm run preview` | Build and run the Worker locally (reads a git-ignored `.dev.vars`) |
| `npm run secrets:put` | Upload `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` to the Worker (values never printed) |
| `npm run deploy` | Build and deploy to Cloudflare |

## Deploying to Cloudflare (free plan)

1. `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`).
2. `npm run secrets:put` (reads `.env.local`, uploads the server secrets to the Worker).
3. `npm run deploy`. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined at build time, so it must be in `.env.local` (or CI secrets).
4. In Clerk: add the deployed URL as an allowed origin, and (optional) register the webhook
   `https://<worker-url>/api/webhooks/clerk`, then set `CLERK_WEBHOOK_SIGNING_SECRET` and run `npm run secrets:put` again.
   Consider disabling public sign-up in Clerk (invitation only).

The Worker bundle is minified (`wrangler.jsonc`) to fit the free plan's 3 MiB compressed limit (currently about 2.8 MiB).
Next is pinned to 16.3.8 because 16.4.0 breaks OpenNext 1.20.11.

## CI / CD

- `.github/workflows/ci.yml`: on every pull request: install, lint, typecheck, unit tests, build.
- `.github/workflows/deploy.yml`: on push to `main`: checks, then deploy to Cloudflare.
- GitHub secrets to set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Testing in an incognito window

1. Open the deployed URL in a private window: you must be redirected to `/sign-in`.
2. `GET /api/overview` without a session returns `401`; `/api/health` is the only public API besides the Clerk webhook.
3. Sign in; confirm your role in the account menu; confirm pages your role cannot use show "no access" and their APIs return `403`.
4. Switch language to Arabic (layout flips, "A-Group" stays Latin) and theme to dark; resize to phone width.

## Layout

- `src/app/(app)/` authenticated pages; `src/app/sign-in/` sign-in; `src/app/api/` route handlers (all behind `guard()`)
- `src/proxy.ts` Clerk protection (Next 16 `proxy`), fails closed when keys are missing
- `src/lib/server/` DB client, access/roles, guard, tenant-scoped queries; `src/lib/period.ts` period maths
- `prisma/` schema, migrations, seed
- `docs/design/company-ui-guidelines.md`, `plans/` product scope and roadmap; `plans/implementation-status.md` current status


