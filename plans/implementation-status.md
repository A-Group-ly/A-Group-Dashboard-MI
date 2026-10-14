# Implementation status vs `implementation-roadmap.md`

_Last updated 2026-10-14, branch `feature/zai-ui-integration`. Status words: **Done**, **Partial**, **Not started**, **Blocked** (needs input or accounts)._

## Summary

| Phase | Status | One line |
|---|---|---|
| 0 Cloudflare / deployment proof | **Blocked** | Needs Neon, Clerk and Cloudflare accounts and a separate PoC repo |
| 1 Data model & security foundations | **Not started** | No User / Organization / Membership models, no isolation middleware |
| 2 Design system & app foundation | **Mostly done** | Tokens, shell, EN/AR RTL, light/dark, tables, charts, states; overlays and a11y audit missing |
| 3 Authentication & protected access | **Not started** | No Clerk, no route protection, every page and API is public |
| 4 First complete subscriber workflow | **Partial (UI only)** | Read-only demo pages from static data; no models, APIs, lifecycle rules or tests |
| 5 Dashboard & financial integration | **Partial** | Finance dashboard reads the database; no CRUD, no server-side MRR/ARR, no auth/roles |
| 6 Operations & reliability | **Partial** | Refresh status, alerts (calculated), CSV export done; TV mode, CI, monitoring, backups not done |

## Phase 0 — Technical feasibility (Blocked)
- [ ] Cloudflare Workers PoC in a separate repo, Group A tests A1–A13 — **not done**
- [ ] Prisma + Neon, Clerk-protected route on Workers — **not done**
- [ ] Decision Workers vs Vercel recorded — **not done**
- Existing evidence only: Next 16.4.0 builds locally (`npm run build` passes). `next.config.ts` enables Turbopack Tailwind rules, which the plans say may conflict with OpenNext (unverified).

## Phase 1 — Data model & security (Not started)
- [x] Initial migration and idempotent seed (upserts) exist
- [x] Local development database works
- [ ] User, Organization, OrganizationMembership models — not done
- [ ] Tenant-isolation middleware, role checks — not done
- [ ] Seed production guard (`NODE_ENV` check) — not done
- [ ] Authorization / isolation tests — not done
- Known schema gap: `MonthlyBudget` unique key includes a nullable `platformId`, so duplicate company-wide budgets are possible in PostgreSQL. Needs a reviewed migration.

## Phase 2 — Design system (Mostly done)
- [x] Design tokens (company guidelines + live A-Group / A-Stay palette) in `globals.css`
- [x] Navigation shell: sidebar, header, mobile drawer, skip link, breadcrumbs
- [x] Data display: cards, badges (text + colour), `DataTable` (search, filters, sort, pagination, clear), comparison bars, KPI cards
- [x] Feedback: loading skeletons, empty, error + retry, stale/failed refresh states
- [x] Localization EN/AR with RTL, logical CSS, Latin brand names in Arabic
- [x] Light/dark theme (class-based, no flash)
- [x] Demo-data labelling (header badge, banners, CSV marker column)
- [x] Existing dashboard integrated into the new system
- [ ] Overlay components (dialog, dropdown, tooltip) — not done
- [ ] Form component set — partial (inline controls only)
- [ ] Component stories / examples — not done
- [ ] Automated accessibility audit (axe) and measured WCAG AA contrast — not done (manual checks only)
- [ ] Logo mark — placeholder "A" tile; official SVG needed

## Phase 3 — Authentication (Not started)
Everything: Clerk, middleware, webhook with signature check, sign-in pages, protected routes, 401/403 API behaviour, roles in UI, organization management, invitations, portfolio view, auth tests.

## Phase 4 — Subscriber workflow (Partial, UI only)
- [x] Read-only pages: Organizations, Customers (+ detail with subscriptions / invoices / payments), Subscriptions (+ detail with timeline)
- [x] Search, filters, sorting, pagination on those lists
- [ ] Customer, Product, Plan, Subscription, Invoice, Payment **database models** — not done
- [ ] Create / edit / cancel workflows, lifecycle state machine, validation, duplicate prevention — not done (deliberately no fake forms)
- [ ] Outstanding balances & collections as a workflow — only shown as demo reports/alerts
- [ ] Tests for the workflow — not done
- The data is static fictional data in `src/lib/subscriptionDemo.ts`.

## Phase 5 — Dashboard & financial integration (Partial)
- [x] KPI cards, cash flow, budget burndown, payment channels, transactions table read from PostgreSQL (`/api/dashboard`, `/api/transactions`)
- [x] Fixed: API→UI mapping, UTC month ranges, input validation (400)
- [x] Month-over-month comparisons (income by platform, expenses by category) with visible filters
- [x] Monthly report in the company template structure (executive summary, month in numbers, delivered, carried over, assessment, sources, proposals, sign-off) with print / save as PDF
- [x] CSV export (formula-injection safe)
- [x] Calculated alerts with documented rules
- [ ] Transaction CRUD with validation and audit — not done
- [ ] Revenue classes (invoiced / collected / recognised / recurring) from real invoices — not done (demo only)
- [ ] MRR / ARR **server-side** — currently computed in the browser from demo data (violates Category 3 rule)
- [ ] Budget planning (set caps) — read-only
- [ ] Money precision: DB uses `Decimal(19,4)` but the API converts to JavaScript numbers — needs a decimal-safe path before real money
- [ ] Drill-down links from KPIs / charts to filtered records — not done
- [ ] Income statement, cash-flow statement, aging report from real data — not done
- [ ] Role-based access to financial data — not done

## Phase 6 — Operations & reliability (Partial)
- [x] Interactive refresh status, auto-refresh (hidden-tab pause, no overlapping requests)
- [x] `/api/health` with DB check
- [x] README with setup and limits
- [ ] TV mode — not done
- [ ] Saved views, KPI customisation — not done
- [ ] Security audit trail, rate limiting, logging/monitoring, backups, rollback, release checklist, free-tier monitoring, CI — not done

## Verification evidence (run 2026-10-14)
`tsc` clean · ESLint 0 errors (1 pre-existing warning in `seed.ts`) · `npm test` 13/13 · `npm run build` passes · `test-financial-calculations.js` 14/14 against the local seeded DB · browser checks of all routes (no console errors, no horizontal overflow, EN/AR, light/dark, refresh failure/recovery).
Not yet verified: screen-reader behaviour, measured contrast ratios, print output in a real PDF, mobile widths on every page, behaviour when the database is down on first load.

## Needed from you to continue
See the chat summary; short version — accounts (Neon, Clerk, Cloudflare or Vercel), a deployment decision, role / super-admin decisions, billing rules, platform brand colours + logo, targets/headcount source for the report.
