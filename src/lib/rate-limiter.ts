/**
 * Rate Limiter for SigmaMail API Routes
 * 
 * Provides an in-memory sliding window rate limiter designed for single-instance
 * deployments and server processes.
 * 
 * Multi-instance production caveat:
 * In-memory rate limiting tracks counters in node process memory. For horizontally
 * autoscaled serverless clusters, an external distributed cache (e.g. Upstash Redis)
 * should be plugged into checkRateLimit() using the provided interface.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  Array.from(memoryStore.entries()).forEach(([key, record]) => {
    // Keep only timestamps from the last 15 minutes
    record.timestamps = record.timestamps.filter((ts: number) => now - ts < 15 * 60 * 1000);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  });
}, 5 * 60 * 1000).unref(); // unref so it does not block node process exit

export interface RateLimitOptions {
  limit: number; // Maximum allowed requests
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Checks and updates rate limit for a given identifier (e.g. userId:endpoint).
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options;
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = memoryStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(identifier, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = oldestTimestamp ? Math.max(0, oldestTimestamp + windowMs - now) : windowMs;

    return {
      success: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    success: true,
    limit,
    remaining,
    resetMs: windowMs,
  };
}

/**
 * Utility to clear store for automated tests.
 */
export function _resetRateLimitStore() {
  memoryStore.clear();
}
