# A-Group Subscription & Financial Dashboard

Bilingual (EN / AR, RTL) executive dashboard for A-Group Holding. Next.js 16 (App Router), React 19,
TypeScript, Tailwind 4, Prisma 5 + PostgreSQL.

> **Everything shown is fictional demo data.** No real customer data and no real payment processing.
> **There is no authentication yet** — every page and API route is public. Do not deploy this build
> with real data. See `plans/` for the approved scope and roadmap.

## What works today

| Area | Source of data |
|---|---|
| Overview, Transactions, Budgets & Cash Flow | PostgreSQL via `/api/dashboard` and `/api/transactions` (falls back to a **clearly labelled** demo set if the database is unreachable) |
| Organizations, Customers, Subscriptions (+ detail pages), Reports, Alerts & Activity | Static demo data in `src/lib/subscriptionDemo.ts` (read-only; not in the database) |
| Settings | Browser `localStorage` (theme, language, data source, auto-refresh interval) |

Shell features: light/dark theme, EN/AR with RTL, month and currency (LYD/USD are never combined),
interactive refresh status (timestamp only moves after a *successful* fetch; failed refreshes keep the last
valid data), optional auto-refresh that pauses while the tab is hidden, CSV export of transactions.

## Setup

```bash
npm install
cp .env.example .env        # then set DATABASE_URL to a NON-production Postgres database
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # demo data (idempotent upserts) — never run against production
npm run dev                 # http://localhost:3000
```

Never commit `.env`. `.env.example` lists variable names only.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Next.js |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for pure logic (`tests/`, Node's built-in runner) |
| `node test-financial-calculations.js` | Read-only regression checks against the seeded database |

## Layout

- `src/app/` — routes (`/`, `/organizations`, `/customers[/id]`, `/subscriptions[/id]`, `/transactions`, `/budgets`, `/reports`, `/alerts`, `/settings`) and API routes
- `src/components/providers/` — app preferences and dashboard data (fetching, refresh status)
- `src/components/ui/` — design-system primitives and the shared `DataTable`
- `src/lib/` — calculations, API→UI mapping, month helpers, CSV, translations, demo data
- `docs/design/company-ui-guidelines.md` — visual source of truth; `plans/` — product scope and roadmap

## Not implemented yet (see `plans/implementation-roadmap.md`)

Authentication / roles / tenant isolation, create-edit workflows, TV mode, CI, deployment configuration,
and database models for organizations, customers, subscriptions, invoices and payments.
