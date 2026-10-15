# A-Group Subscription & Financial Dashboard

A bilingual (English / Arabic, RTL) executive dashboard for **A-Group Holding**: one place to see how much money came in,
what customers still owe, what the company has spent and still has to spend this month, and how the subscription
business is doing, in **LYD and USD side by side** (never mixed or converted).

Anyone with the link lands on a sign-in page. After signing in they see live data from a PostgreSQL database; what
they can see and do depends on their role.

> **Demo data.** Every customer, invoice and transaction is fictional (about 2,000 synthetic customers, `example.com`
> emails). Payments are simulated records: no real money moves and no payment provider is contacted.

**Stack (all free tiers):** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 5 ·
**Neon** PostgreSQL · **Clerk** authentication · **Cloudflare Workers** hosting (OpenNext) · GitHub Actions CI/CD.

---

## What you can do with it

| Area | Highlights |
|---|---|
| **Overview** | Tabs: *Summary* (business pulse, financial position, key figures), *Charts* (trend / compare / mix), *Breakdown* (payment channels, budget burn-down, comparisons), *Activity* (action center, recent activity, latest transactions). |
| **Financial position** | Total paid, outstanding debts (overdue vs not yet due), payments **expected by the end of the month**, money **spent so far** and **expected total spend** against the monthly budget. |
| **Currencies** | USD (left) and LYD (right) side by side, or a **Both / USD / LYD** toggle for one currency at full width. |
| **Filters** | Period (day, week, month, quarter, half-year, custom) with automatic comparison to the equivalent previous period; platform scope; saved views; every table has its own Filters panel with removable chips. |
| **Customers · Subscriptions · Invoices** | Server-side search, filter, sort and pagination (built for thousands of rows); add / edit / deactivate customers; start, pause, resume, cancel subscriptions; issue, void and print invoices; record **simulated** payments, singly or in **bulk**; payment reminders (simulated, audited). |
| **Finance** | Transactions (add / edit / delete), monthly budgets, cash trend, MRR / ARR and ageing analytics, monthly management report (print / PDF). |
| **Control** | Roles and permissions, user management, **audit log** of every change, CSV export of customers, subscriptions, invoices and transactions. |
| **Everyday comfort** | Global search (`Ctrl/⌘ + K`) with recently viewed, keyboard shortcuts (`?`), notification bell, click-to-copy, collapsible sidebar, compact/comfortable density, customizable overview, **TV mode** (`/tv`) wallboard, light/dark theme, fully responsive from phone to wallboard. |

## Roles and permissions

Enforced **on the server for every API call**; the interface only hides what a role cannot use.

| Role | Can use |
|---|---|
| `READ_ONLY` | Overview, settings |
| `ANALYST` | + transactions, budgets, reports, CSV export (view only) |
| `FINANCE` | + customers, subscriptions, invoices, alerts, and all create / edit / record-payment actions |
| `ADMIN` | + organizations, plan catalog, user management, audit log |

The first person to sign in becomes `ADMIN`; everyone else starts as `READ_ONLY` and is promoted in **Settings → Users**.
The last active admin can never be demoted or deactivated.

## How it is built

```
Browser ──► Cloudflare Worker (Next.js via OpenNext)
              ├─ proxy.ts           Clerk sign-in gate (pages redirect, APIs return 401; fails closed)
              ├─ /api/*  guard()    authentication → role check → tenant scoping → validation → audit
              └─ Prisma (wasm) ──► Neon PostgreSQL (pooled connection)
```

- **Tenant isolation:** the organization always comes from the signed-in session, never from the request.
- **Money:** `Decimal(19,4)` in the database, aggregated by PostgreSQL; currencies are always separate.
- **Performance on a free plan:** the Overview needs about 14 SQL statements for both currencies (the Worker's CPU budget is
  tiny), bulk actions run in small batches, lists are paginated on the server, and the app quietly wakes the server and
  database before they are needed.
- **Integrity:** every write is validated, runs in a transaction together with its audit entry, and uses atomic status
  changes so a double click cannot pay an invoice twice.
- **Accessibility:** keyboard navigation, focus rings, labelled controls, text alternatives for charts, reduced-motion support.

## Run it locally

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env.local       # fill in your Neon + Clerk values (never commit them)
cp .env.local .env               # the Prisma CLI reads .env only
npx prisma migrate deploy        # create the tables on a NON-production database
npx prisma db seed               # base demo data (idempotent; refused when NODE_ENV=production)
npm run demo:scale -- --confirm  # optional: the 2,000-customer synthetic dataset (see below)
npm run dev                      # http://localhost:3000
```

`.env.example` lists every variable name with placeholders only. No secret is ever stored in the repository.

### Environment variables

| Variable | Where it is set | Purpose |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | `.env.local` / Cloudflare secret | Neon pooled (app) and direct (migrations) connections |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local`, GitHub secret (inlined at build) | Clerk public key |
| `CLERK_SECRET_KEY` | `.env.local` / Cloudflare secret | Clerk server key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | optional | Verifies Clerk user-sync webhooks |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub secrets | Used by the deploy workflow only |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` · `npm test` | Quality checks (CI runs all three plus a build) |
| `npm run build:cf` · `npm run preview` · `npm run deploy` | Cloudflare (OpenNext) build, local Worker preview, deploy |
| `npm run secrets:put` | Upload the server secrets to the Worker without printing them |
| `npm run demo:validate` | Offline check of the synthetic dataset (counts, foreign keys, reconciliation); no database |
| `npm run demo:scale` | Dry run of the 2,000-customer dataset; add `-- --confirm` to write it (additive, idempotent) |

### Synthetic demo dataset

Deterministic (fixed seed) and clearly fictional: 1,200 individuals, 500 small businesses, 200 medium businesses, 80 enterprises
and 20 public-sector demonstration entities across Tripoli, Benghazi, Misrata, Sabha, Zawiya, Bayda and Derna, with about
2,200 subscriptions, 3,600 invoices, 2,900 simulated payments and 3,500 transactions. It reuses the existing tables, and the
generator refuses to run in production.

## Deploying (Cloudflare Workers, free plan)

1. `npx wrangler login`, or set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.
2. `npm run secrets:put` uploads `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` to the Worker.
3. `npm run deploy` builds and publishes. In Clerk, set **Sign-up mode** to *Public* if anyone with the link may register.

The Worker bundle is minified to stay under the free plan's 3 MiB limit. Next.js is pinned to 16.3.8 because 16.4.0 is not
yet compatible with OpenNext 1.20.

## CI / CD

- **Pull request → `master`:** install, lint, typecheck, unit tests, production build.
- **Push to `master`:** the same checks, then an automatic deploy to Cloudflare.
- GitHub secrets needed: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Testing

- `npm test`: unit tests for the pure logic (periods, billing maths, permissions, validation, paging, retry, the dataset).
- `scripts/e2e-writes.mjs`: end-to-end check of every write API against a running dev server and the real database
  (creates clearly named test rows, then removes them).
- `scripts/check-billing-sql.mjs`, `scripts/check-i18n.mjs`: SQL aggregates equal the reference maths; English and Arabic
  translations are complete.
- **Manual check in a private window:** the live URL redirects to `/sign-in`; `GET /api/overview` without a session returns
  `401`; after signing in, the pages your role cannot use show "no access" and their APIs return `403`; switch to Arabic
  (layout mirrors, "A-Group" stays Latin), dark mode and a phone-width window.

## Repository map

```
src/app/(app)/        signed-in pages        src/app/api/        route handlers (all behind guard())
src/app/tv/           wallboard              src/proxy.ts        Clerk gate (Next 16 "proxy")
src/components/       UI, charts, forms      src/lib/server/     database, access, SQL aggregates, validation
src/lib/              periods, billing, permissions, translations
prisma/               schema, migrations, seeds, synthetic dataset generator
plans/  docs/design/  product scope, roadmap, UI guidelines
```

## Known limits

Real payment processing, partial payments and invoice e-mailing are out of scope (payments and reminders are simulated). On
Cloudflare's free plan each request has a very small CPU budget, so a cold start can occasionally return a transient error;
the app retries reads automatically and asks you to press the button again for writes. The logo is the A-Group mark supplied by the company.
