/**
 * ratelimit.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Sliding-window in-memory rate limiter for Next.js API routes (Node runtime).
 *
 * ⚠️  In-memory only — resets on cold starts (Vercel serverless).
 *     For multi-instance deployments use Upstash Redis instead.
 *     For a single-server deployment this provides strong protection.
 *
 * Usage:
 *   const result = rateLimit(ip, 'contact');
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface WindowEntry {
  hits:        number;
  windowStart: number;
}

// Keyed by  "<namespace>:<ip>"
const store = new Map<string, WindowEntry>();

// ── Per-endpoint limits ───────────────────────────────────────────────────────
const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  contact: { limit: 5,  windowMs: 60_000 },   // 5 requests / minute
  order:   { limit: 8,  windowMs: 60_000 },   // 8 requests / minute
  default: { limit: 30, windowMs: 60_000 },   // 30 requests / minute (other API routes)
};

// Clean up stale entries every 10 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      const { windowMs } = LIMITS[key.split(':')[0]] ?? LIMITS.default;
      if (now - entry.windowStart > windowMs * 2) store.delete(key);
    }
  }, 10 * 60_000).unref?.();
}

export interface RateLimitResult {
  ok:        boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Check and record a request.
 *
 * @param ip        Client IP address (from request headers).
 * @param namespace Logical name matching a key in LIMITS (e.g. 'contact').
 */
export function rateLimit(ip: string, namespace = 'default'): RateLimitResult {
  const cfg    = LIMITS[namespace] ?? LIMITS.default;
  const { limit, windowMs } = cfg;
  const key    = `${namespace}:${ip}`;
  const now    = Date.now();
  const entry  = store.get(key);

  // Window expired or first visit → start fresh window
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { hits: 1, windowStart: now });
    return { ok: true, remaining: limit - 1, resetInMs: windowMs };
  }

  const elapsed = now - entry.windowStart;

  if (entry.hits >= limit) {
    return { ok: false, remaining: 0, resetInMs: windowMs - elapsed };
  }

  entry.hits++;
  return { ok: true, remaining: limit - entry.hits, resetInMs: windowMs - elapsed };
}

/** Extract client IP from a Next.js request (handles proxies / Vercel). */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
