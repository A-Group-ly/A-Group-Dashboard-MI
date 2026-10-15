/**
 * Wake the server (and the free-tier database) a moment before it is needed. The first request after a quiet period
 * is the slow one; calling this when a page or a form opens means the real action finds everything warm.
 * Rate-limited and fire-and-forget: it never throws and never blocks anything.
 */
let last = 0;

export function warmServer(minGapMs = 20000): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - last < minGapMs) return;
  last = now;
  fetch('/api/health', { cache: 'no-store', keepalive: true }).catch(() => {});
}
