import "server-only";

/**
 * Simple in-memory fixed-window rate limiter. Adequate for this app's
 * deployment model (single company per instance, no horizontal scaling —
 * see Docs/ASSUMPTIONS.md tenancy decision), and is a defense-in-depth
 * throttle layered on top of real auth/authorization checks, not a
 * replacement for them. Not durable across process restarts — that's fine
 * here; a restart clearing counters is a non-issue for this use case.
 *
 * For endpoint-specific brute-force tracking tied to a business key (e.g.
 * login attempts by email), prefer a DB-backed table like `LoginAttempt`
 * instead — this helper is for generic per-IP/per-key request throttling.
 */
const buckets = new Map<string, { count: number; windowStart: number }>();

// Prevent unbounded memory growth from a flood of distinct keys (e.g. spoofed
// IPs) — sweep old windows out periodically.
const MAX_BUCKETS = 50_000;

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (now - b.windowStart >= windowMs) buckets.delete(k);
      }
    }
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
