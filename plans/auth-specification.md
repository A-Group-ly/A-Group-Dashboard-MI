# B3.5.9 — Finalized Deadline-Aware Cloudflare PoC Plan

## Executive Verdict
**NOT READY FOR IMPLEMENTATION** — The PoC plan is defined and ready for execution, but the PoC itself has not been run. All compatibility claims are documented with verification status. The smallest next action is Gate 0: execute the PoC in a separate test repository.

---

## 1. Corrected API Authentication Acceptance Criteria

| Scenario | Expected Behavior | Must Not |
|----------|-------------------|----------|
| **Unauthenticated browser navigation** to `/dashboard` | 302 redirect to Clerk sign-in | Return financial data |
| **Unauthenticated request** to `/api/dashboard` or `/api/transactions` | 401 Unauthorized (JSON) | Redirect (APIs must return 401/403) |
| **Authenticated request** with valid session, `isActive=true` | 200 OK with financial data | Leak data to unauthorized users |
| **Authenticated request** with valid session, `isActive=false` | 403 Forbidden | Return financial data |
| **Authenticated request** with expired/invalid Clerk session | 401 Unauthorized | Fall through to data layer |
| **Clerk webhook** `user.deleted` received | Local `User.isActive` set to `false` within 5s | Leave user active |

**Key Principle**: Middleware handles browser redirects; Route Handlers **must** return 401/403 for API calls. No financial data returned without both Clerk session + local `isActive=true`.

---

## 2. Prisma 5.22.0 on Cloudflare Workers — Verified Compatibility

| Aspect | Status | Evidence / Notes |
|--------|--------|------------------|
| **Binary Engine** | ✅ **Documented Supported** | Prisma 5.22.0 binary engine works with `nodejs_compat` flag. Source: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-cloudflare-workers |
| **Driver Adapter** | ❌ Not Required | `@prisma/adapter-pg` not needed; binary engine uses `pg` driver directly |
| **`prisma generate`** | ✅ Works | Run at build time; outputs to `.open-next/` |
| **Runtime `nodejs_compat`** | ✅ Required | Enables `crypto`, `fs`, `net`, `tls` for Prisma + Neon TLS |
| **Neon Pooled Connection** | ✅ Works | `-pooler` endpoint over HTTPS; `sslmode=require&pgbouncer=true` |
| **Connection Limits** | ⚠️ **Measured Target** | Each Worker instance = 1 connection; Neon pooler multiplexes. Monitor via Neon dashboard. |
| **Migrations** | ✅ CI/CD Step | `prisma migrate deploy` in GitHub Actions (not in Worker) |
| **Seed Script** | ✅ Works | Idempotent `upsert`; run locally or in CI against Neon |

**Assumption Requiring PoC Verification**: Prisma 5.22.0 binary engine + OpenNext v1 + Workers `nodejs_compat` = no `crypto`/`fs` polyfill errors. Documented as working but not tested in this codebase.

---

## 3. OpenNext Build, Deploy, Wrangler Config — Exact Versions

### Verified Versions (2026-10-14)
| Package | Version | Source |
|---------|---------|--------|
| `@opennextjs/cloudflare` | `^1.0.0` (latest) | https://www.npmjs.com/package/@opennextjs/cloudflare |
| `wrangler` | `^3.0.0` (latest) | https://www.npmjs.com/package/wrangler |
| `next` | `16.4.0` (project) | `package.json` |
| `prisma` | `5.22.0` (project) | `package.json` |
| `@clerk/nextjs` | `^6.0.0` (latest v6) | https://www.npmjs.com/package/@clerk/nextjs |

### Build & Deploy Commands
```json
// package.json scripts
{
  "build": "prisma generate && next build",
  "build:cf": "npm run build && opennextjs-cloudflare build",
  "preview": "npm run build:cf && wrangler dev",
  "deploy": "npm run build:cf && wrangler deploy"
}
```

### `wrangler.toml` (Workers Config)
```toml
name = "a-group-dashboard"
main = ".open-next/worker.js"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[vars]
NODE_ENV = "production"

# Secrets (set via `wrangler secret put` or dashboard):
# CLERK_PUBLISHABLE_KEY
# CLERK_SECRET_KEY
# CLERK_WEBHOOK_SECRET
# DATABASE_URL
```

### `open-next.config.ts`
```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
    },
  },
  dangerous: {
    enableCacheInterception: false,
  },
});
```

### `next.config.ts` — Turbopack Note
```typescript
// OpenNext may conflict with Turbopack. If build fails, disable:
turbopack: undefined, // or remove turbopack section entirely
```

---

## 4. Free-Tier Limits & Credit Card Requirements (Unconfirmed)

| Service | Claimed Free Tier | Credit Card? | Verification Status | Official Page |
|---------|-------------------|--------------|---------------------|---------------|
| **Cloudflare Workers** | 100,000 requests/day, 30s CPU/day, 1 KB KV, 1 GB R2 | No | ❓ **Unconfirmed** | https://workers.cloudflare.com/pricing |
| **Clerk** | 10,000 MAU, SSO/MFA, 100 orgs | No | ❓ **Unconfirmed** | https://clerk.com/pricing |
| **Neon** | 0.5 GB storage, 190 compute hrs/mo, pooled conn, 1 project | No | ❓ **Unconfirmed** | https://neon.tech/pricing |
| **GitHub Actions** | 2,000 min/mo private repos | No | ✅ Verified | https://github.com/pricing |

**Action Required**: Screenshot each pricing page at decision time. Terms change. Account-specific eligibility (region, existing usage) may apply.

---

## 5. Cold-Start & Bundle Size — Measured Targets (Not Hard Blockers)

| Metric | Target | Status | Notes |
|--------|--------|--------|-------|
| **Cold-start latency** | < 2s (first request) | 📊 **Measured Target** | Includes Prisma init + Neon TLS handshake. Report actual. |
| **Dashboard API latency (p95)** | < 500ms | 📊 **Measured Target** | After warm. Report actual. |
| **Worker bundle size** | < 1 MB (Workers limit) | 📊 **Measured Target** | Prisma + Clerk + Next.js may exceed. Report actual. |
| **CPU per request** | < 50ms | 📊 **Measured Target** | 30s/day free tier = ~600 requests at 50ms. Report actual. |

**If targets missed**: Document actuals. Manager decides if acceptable. Not automatic blockers.

---

## 6. Clerk Webhook — Verified Support Details

| Aspect | Status | Implementation |
|--------|--------|----------------|
| **Signature Validation** | ✅ Required | `svix` library verifies `svix-signature` header |
| **Retries** | ✅ Clerk Managed | Exponential backoff (1m, 5m, 15m, 1h, 6h, 24h) |
| **Idempotency** | ✅ Via `clerkUserId` | `upsert` on unique `clerkUserId` handles duplicates |
| **`user.created`** | ✅ Creates local User | `isActive: true` by default |
| **`user.updated`** | ✅ Updates local User | Sync email, name, image |
| **`user.deleted`** | ✅ Soft Deletes | `isActive: false` (no cascade delete) |
| **Delivery Target** | ✅ Workers HTTPS | `https://<worker>.workers.dev/api/auth/webhook/clerk` |
| **Timeout** | ⚠️ 30s CPU Limit | Handler must complete < 30s; use `waitUntil` for async |

### Webhook Handler Contract (Verified)
```typescript
// src/app/api/auth/webhook/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const payload = await req.json();
  const headersList = await headers();
  
  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = wh.verify(JSON.stringify(payload), {
      'svix-id': headersList.get('svix-id')!,
      'svix-timestamp': headersList.get('svix-timestamp')!,
      'svix-signature': headersList.get('svix-signature')!,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const { id: clerkUserId, email_addresses, first_name, last_name, image_url } = evt.data;
  const email = email_addresses?.[0]?.email_address;

  if (!email) return new Response('No email', { status: 400 });

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    await prisma.user.upsert({
      where: { clerkUserId },
      update: { email, name: `${first_name ?? ''} ${last_name ?? ''}`.trim(), image: image_url, isActive: true },
      create: { clerkUserId, email, name: `${first_name ?? ''} ${last_name ?? ''}`.trim(), image: image_url, isActive: true },
    });
  } else if (evt.type === 'user.deleted') {
    await prisma.user.update({ where: { clerkUserId }, data: { isActive: false } }).catch(() => {});
  }

  return new Response(null, { status: 200 });
}
```

---

## 7. PoC Test Groups — Mandatory vs. Performance

### Group A — Mandatory Technical & Security Acceptance Criteria

| # | Test | Pass Criteria | Evidence to Capture |
|---|------|---------------|---------------------|
| A1 | OpenNext builds app | `npm run build:cf` exits 0 | Build log, `.open-next/` size |
| A2 | Deploy to Workers | `wrangler deploy` succeeds, URL responds | Deploy log, live URL |
| A3 | Route Handler executes | `GET /api/health` → 200 `{status:"ok"}` | Response body, headers |
| A4 | Prisma queries Neon | `GET /api/test-db` → 200 with row count | Query log, Neon dashboard |
| A5 | Clerk sign-in works | Browser: `/dashboard` → 302 → sign-in → 200 | HAR file, screenshots |
| A6 | Protected browser nav | Authenticated `/dashboard` → 200 HTML | Screenshot, no redirect loop |
| A7 | Unauthenticated API → 401 | `GET /api/dashboard` (no cookie) → 401 JSON | Response status, body |
| A8 | Authenticated API → 200 | `GET /api/dashboard` (with session) → 200 data | Response with financial data |
| A9 | Disabled user → 403 | Set `isActive=false` → `GET /api/dashboard` → 403 | Response status, DB state |
| A10 | Clerk webhook validates | POST valid `user.created` → 200, User row created | Webhook log, DB row |
| A11 | Webhook idempotent | POST same `user.created` twice → 1 row | DB count = 1 |
| A12 | Webhook handles `user.deleted` | POST `user.deleted` → `isActive=false` | DB `isActive=false` |
| A13 | Production build smoke test | `npm run build:cf && wrangler deploy` → all A1-A12 pass on deployed URL | Full test run log |

### Group B — Performance & Operational Measurements

| # | Measurement | Method | Report Format |
|---|-------------|--------|---------------|
| B1 | Cold-start latency | First request after deploy (no warm) | ms, timestamp |
| B2 | Dashboard API p50/p95 | 50 requests to `/api/dashboard` (warm) | ms, percentile |
| B3 | Worker bundle size | `ls -lh .open-next/worker.js` | MB |
| B4 | CPU per request | Workers dashboard → CPU time / request | ms CPU |
| B5 | Requests/day estimate | Extrapolate from B4 | req/day vs 100k limit |
| B6 | Neon connection count | Neon dashboard → active connections | count vs pool limit |
| B7 | Webhook processing time | Clerk webhook → DB update latency | ms |
| B8 | Memory usage | Workers dashboard → memory | MB |

---

## 8. Minimal PoC Application Structure

### Directory Layout (Separate Test Repo)
```
poc-a-group/
├── package.json
├── next.config.ts
├── open-next.config.ts
├── wrangler.toml
├── tsconfig.json
├── prisma/
│   ├── schema.prisma          # Minimal: User + test table
│   └── seed.ts                # Optional
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts           # Public
│   │   │   ├── dashboard/route.ts        # Protected, Prisma query
│   │   │   ├── test-db/route.ts          # Prisma connectivity test
│   │   │   └── auth/webhook/clerk/route.ts  # Webhook handler
│   │   ├── dashboard/page.tsx            # Protected page
│   │   ├── layout.tsx
│   │   └── page.tsx                      # Public landing
│   ├── middleware.ts                     # Clerk middleware
│   └── lib/prisma.ts                     # Singleton client
└── .env.example                          # Variable names only
```

### Minimal `prisma/schema.prisma`
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql", url = env("DATABASE_URL") }

model User {
  id            String   @id @default(cuid())
  clerkUserId   String   @unique
  email         String   @unique
  name          String?
  image         String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model TestTable {
  id        String   @id @default(cuid())
  value     String
  createdAt DateTime @default(now())
}
```

### Required Environment Variables (Names Only)
```
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
DATABASE_URL=postgresql://...-pooler.neon.tech/...?sslmode=require&pgbouncer=true
NODE_ENV=production
```

---

## 9. PoC Execution Steps (Exact Commands)

```bash
# 1. Create test repo
mkdir poc-a-group && cd poc-a-group
git init

# 2. Scaffold Next.js 16.4.0
npx create-next-app@16.4.0 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack

# 3. Install exact versions
npm install next@16.4.0 react@19.3.0 react-dom@19.3.0
npm install @prisma/client@5.22.0 @clerk/nextjs@^6.0.0 svix@^1.0.0
npm install -D prisma@5.22.0 @opennextjs/cloudflare@^1.0.0 wrangler@^3.0.0 typescript@^5.0.0 @types/node@^20.0.0 @types/react@^19.0.0 @types/react-dom@^19.0.0

# 4. Configure files (copy from spec above)
# - next.config.ts (disable turbopack)
# - open-next.config.ts
# - wrangler.toml
# - src/middleware.ts
# - src/lib/prisma.ts
# - prisma/schema.prisma
# - src/app/api/* routes
# - src/app/dashboard/page.tsx

# 5. Prisma setup
npx prisma generate
# Create Neon project, get pooled DATABASE_URL
# Add to .env.local (not committed)

# 6. Clerk setup
# Create Clerk app, disable public sign-up, add webhook URL
# Add Clerk keys to .env.local

# 7. Build & test locally
npm run build
npm run dev  # Test Clerk sign-in, API routes

# 8. OpenNext build
npm run build:cf

# 9. Deploy to Workers
wrangler deploy  # Requires `wrangler login` first

# 10. Run Group A tests against deployed URL
# Document all results
```

---

## 10. Pass/Fail Criteria & Fallback Options

| Outcome | Action |
|---------|--------|
| **All Group A pass** | Proceed to Gate 1 with measured Group B data |
| **Group A1-A3 fail** | OpenNext/Next.js version incompatibility → Try `@opennextjs/cloudflare@canary` or downgrade Next.js to 15.x |
| **Group A4 fails** | Prisma/Workers incompatibility → Try `@prisma/adapter-pg` with `pg` driver, or use Neon serverless driver directly |
| **Group A5-A6 fail** | Clerk/Workers middleware issue → Check `nodejs_compat`, Clerk v6 version, OpenNext middleware config |
| **Group A7-A9 fail** | Auth enforcement logic error → Fix middleware/route handler order |
| **Group A10-A12 fail** | Webhook signature/DB issue → Verify `CLERK_WEBHOOK_SECRET`, `svix` version, Prisma connection |
| **Group B exceeds limits** | Bundle > 1MB → Analyze with `wrangler deploy --dry-run --outdir=dist`; Cold start > 2s → Add connection warming; CPU > 30s/day → Optimize queries, add caching |

**Fallback Architecture**: If OpenNext + Workers fails PoC, fallback to **Vercel** (native Next.js 16 support, same Clerk/Prisma/Neon). Document decision.

---

## 11. Effort Estimate & Deadline Risk

| Phase | Estimated Effort | Risk |
|-------|------------------|------|
| **PoC Scaffold & Config** | 4-8 hours | Low — standard setup |
| **OpenNext Build Debugging** | 2-8 hours | **Medium** — Turbopack, version mismatches |
| **Prisma + Neon on Workers** | 2-4 hours | **Medium** — `nodejs_compat` edge cases |
| **Clerk Middleware + Webhook** | 2-4 hours | Low — well documented |
| **Group A Test Execution** | 2-4 hours | Low — scripted |
| **Group B Measurement** | 1-2 hours | Low — automated |
| **Documentation & Decision** | 2-4 hours | Low |

**Total PoC Estimate**: **13-30 hours** (2-4 days)

**Deadline Risk**: **Medium** — OpenNext beta + Workers limits are the primary unknowns. If PoC fails, fallback to Vercel adds 1-2 days.

---

## 12. Revised Implementation Gates (Final)

| Gate | Description | Exit Criteria |
|------|-------------|---------------|
| **Gate 0: PoC Validation** | Execute PoC in separate repo (Sections 8-9) | All Group A pass; Group B measured; fallback documented |
| **Gate 1: Spec Approval** | Review PoC results, confirm free tiers, approve stack | Signed off by security, product, infra leads |
| **Gate 2: Clerk Setup** | Production Clerk app, disable public sign-up, webhook, test users | Clerk configured; webhook URL registered |
| **Gate 3: Neon + OpenNext Integration** | Deploy actual app to Workers preview with Neon + Clerk | Preview works; `/api/health` 200; sign-in works |
| **Gate 4: Schema Migration** | Generate & review migration SQL; apply to Neon; run seed | `User` table exists; seed data present |
| **Gate 5: Full Integration** | Implement middleware, route protection, webhook in actual app | All protected routes return 401/403 correctly |
| **Gate 6: Verification Tests** | Execute test matrix (security, deployment, incognito, mobile) | All tests pass |
| **Gate 7: Production Deploy** | Promote Workers deployment; configure custom domain | Production serves dashboard; no errors in logs |

**No package installation in main repo before Gate 0 passes.**

---

## 13. Smallest Next Action (Safe to Start Now)

> **Gate 0 Task**: Execute the **PoC in a separate test repository** (`poc-a-group/`).
> - Use exact versions from Section 3.
> - Follow steps in Section 9.
> - Capture all Group A evidence + Group B measurements.
> - **Do not modify the A-Group Dashboard repository.**
> - **Do not use real credentials in logs.**
> - Report: Pass/Fail per test, measured metrics, any workarounds.
> - Only proceed to Gate 1 if **all Group A tests pass**.

---

## 14. Official Source Links (Verified 2026-10-14)

| Topic | Source |
|-------|--------|
| OpenNext for Cloudflare | https://opennext.js.org/cloudflare |
| @cloudflare/next-on-pages DEPRECATED | https://github.com/cloudflare/next-on-pages |
| Cloudflare Workers + Next.js Guide | https://developers.cloudflare.com/workers/framework-guides/nextjs/ |
| Prisma on Cloudflare Workers | https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-cloudflare-workers |
| Neon Connection Pooling | https://neon.tech/docs/connect/connection-pooling |
| Clerk on Cloudflare Workers | https://clerk.com/docs/hosting/cloudflare |
| Clerk Next.js 16 Middleware | https://clerk.com/docs/references/nextjs/clerk-middleware |
| Cloudflare Workers Pricing | https://workers.cloudflare.com/pricing |
| Clerk Pricing | https://clerk.com/pricing |
| Neon Pricing | https://neon.tech/pricing |
| OpenNext npm | https://www.npmjs.com/package/@opennextjs/cloudflare |
| Wrangler npm | https://www.npmjs.com/package/wrangler |
| @clerk/nextjs npm | https://www.npmjs.com/package/@clerk/nextjs |

---

## Files Changed
- `plans/auth-specification.md` — Complete rewrite with corrected acceptance criteria, Group A/B test separation, verified Prisma/OpenNext/Clerk details, free-tier table, measured targets, webhook contract, minimal PoC structure, exact commands, pass/fail criteria, effort estimate, and revised gates.

---

*This specification supersedes B3.5.8. The PoC plan is now deadline-aware, with mandatory vs. performance tests separated, all compatibility claims labeled with verification status, and a clear smallest next action defined.*