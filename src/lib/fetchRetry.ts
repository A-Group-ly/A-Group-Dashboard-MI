/**
 * GET with automatic retry for transient failures (HTTP 5xx, network errors). The first request after a quiet period
 * can hit a cold Worker or a sleeping free-tier database; one more attempt a moment later succeeds, so users never
 * see an error screen for it. 4xx answers (401 / 403 / 404 / validation) are real answers and are returned as they are.
 */
export async function fetchRetry(url: string, init: RequestInit = {}, retries = 2): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500) return res;
      last = res;
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') throw e;
      if (attempt === retries) throw e;
    }
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  return last as Response;
}
