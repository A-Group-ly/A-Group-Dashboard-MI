/**
 * Short-lived server cache for expensive, read-only results (overview, analytics, alert counts).
 *
 * - Lives in the memory of the running instance (a Cloudflare Worker's Cache API does not work on workers.dev, and a
 *   few seconds of staleness is fine for a dashboard).
 * - Keyed by organization, a per-organization version, the report name and its parameters, so one tenant can never
 *   see another's data, and a write made through this instance invalidates that organization's entries at once.
 * - Identical requests that arrive together share ONE computation (no database stampede on page load).
 * - If a refresh fails (database asleep, transient error) the previous result is served for up to 10 minutes instead
 *   of an error, so the dashboard keeps working.
 */
interface Entry {
  value: unknown;
  freshUntil: number;
  keepUntil: number;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const versions = new Map<string, number>();
const MAX_ENTRIES = 80;
const KEEP_STALE_MS = 10 * 60 * 1000;

const versionOf = (org: string) => versions.get(org) ?? 0;

/** Call after a successful write for this organization: its cached reads are dropped immediately. */
export function invalidateOrg(org: string): void {
  versions.set(org, versionOf(org) + 1);
}

function prune(now: number) {
  if (store.size <= MAX_ENTRIES) return;
  for (const [k, e] of store) if (e.keepUntil < now) store.delete(k);
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export async function cached<T>(org: string, name: string, params: string, ttlMs: number, fresh: boolean, compute: () => Promise<T>): Promise<T> {
  const key = `${org}|${versionOf(org)}|${name}|${params}`;
  const now = Date.now();
  const hit = store.get(key);
  if (!fresh && hit && hit.freshUntil > now) return hit.value as T;

  const running = inflight.get(key);
  if (running && !fresh) return running as Promise<T>;

  const run = compute()
    .then((value) => {
      const t = Date.now();
      store.delete(key); // re-insert so the newest entries are last (simple LRU order)
      store.set(key, { value, freshUntil: t + ttlMs, keepUntil: t + KEEP_STALE_MS });
      prune(t);
      return value;
    })
    .catch((e) => {
      // Serve the last good result rather than an error screen.
      if (hit && hit.keepUntil > Date.now()) return hit.value as T;
      throw e;
    })
    .finally(() => {
      if (inflight.get(key) === run) inflight.delete(key);
    });
  inflight.set(key, run);
  return run;
}
