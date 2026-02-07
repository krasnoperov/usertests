/**
 * Rate Limiting Middleware (B4)
 *
 * Simple in-memory rate limiter for public SDK endpoints.
 * Uses per-IP and per-session sliding windows.
 *
 * NOTE: In-memory state is per-worker-isolate. On Cloudflare Workers this
 * resets on cold starts, which is acceptable for MVP-grade protection.
 * For production hardening, migrate to Cloudflare Rate Limiting or KV.
 */

import type { Context, Next } from 'hono';

interface RateBucket {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, RateBucket>();
const sessionBuckets = new Map<string, RateBucket>();

// Garbage-collect stale buckets every 5 minutes
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGC = Date.now();

function gc() {
  const now = Date.now();
  if (now - lastGC < GC_INTERVAL_MS) return;
  lastGC = now;

  for (const [key, bucket] of ipBuckets) {
    if (bucket.resetAt <= now) ipBuckets.delete(key);
  }
  for (const [key, bucket] of sessionBuckets) {
    if (bucket.resetAt <= now) sessionBuckets.delete(key);
  }
}

function checkBucket(
  store: Map<string, RateBucket>,
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): boolean {
  gc();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count++;
  return true;
}

function getClientIP(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Create an IP-based rate limiter.
 */
export function ipRateLimit(maxPerMinute: number) {
  return async (c: Context, next: Next) => {
    const ip = getClientIP(c);
    const routeKey = `${c.req.method}:${c.req.routePath}`;
    const key = `${ip}:${routeKey}`;

    if (!checkBucket(ipBuckets, key, maxPerMinute)) {
      return c.json({ error: 'Too many requests. Please slow down.' }, 429);
    }

    await next();
  };
}

/**
 * Create a session-based rate limiter (uses X-Session-Id header or URL param).
 */
export function sessionRateLimit(maxPerMinute: number) {
  return async (c: Context, next: Next) => {
    const sessionId =
      c.req.header('x-session-id') ||
      c.req.param('sessionId') ||
      'unknown';
    const routeKey = `${c.req.method}:${c.req.routePath}`;
    const key = `session:${sessionId}:${routeKey}`;

    if (!checkBucket(sessionBuckets, key, maxPerMinute)) {
      return c.json({ error: 'Too many requests for this session.' }, 429);
    }

    await next();
  };
}
