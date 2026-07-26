// In-memory sliding window rate limiter
// For multi-instance deployments, replace with Redis store

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

const ONE_MINUTE = 60_000;

export function rateLimit(opts: { key: string; limit: number; windowMs?: number }) {
  const windowMs = opts.windowMs ?? ONE_MINUTE * 15;
  const now = Date.now();
  const entry = store.get(opts.key);

  if (!entry || entry.resetAt <= now) {
    store.set(opts.key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: opts.limit - 1, resetIn: windowMs };
  }

  if (entry.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: opts.limit - entry.count, resetIn: entry.resetAt - now };
}

// Periodically purge expired entries to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, ONE_MINUTE * 5);

export function ipFromRequest(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}
