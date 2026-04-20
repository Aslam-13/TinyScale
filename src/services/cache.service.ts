import { type FastifyInstance } from "fastify";
import { cacheHitsTotal, cacheMissesTotal } from "../plugins/metrics.plugin.js";

// Default TTL: 1 hour (in seconds)
const DEFAULT_TTL = 3600;

// Prefix all cache keys to avoid collisions with other Redis uses
// (BullMQ, sessions, rate limits will also use Redis)
const KEY_PREFIX = "cache:";

/**
 * Cache-aside: Get from cache, or fetch from source and cache the result.
 */
export async function cacheGet<T>(
  app: FastifyInstance,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cacheKey = `${KEY_PREFIX}${key}`;

  try {
    const cached = await app.redis.get(cacheKey);
    if (cached !== null) {
      app.log.debug({ key: cacheKey }, "Cache HIT");
      cacheHitsTotal.inc();
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    // Graceful degradation — if Redis fails, fall through to the source
    app.log.warn(err, "Redis GET failed, falling through to database");
  }

  app.log.debug({ key: cacheKey }, "Cache MISS");
  cacheMissesTotal.inc();
  const value = await fetchFn();

  try {
    await app.redis.set(cacheKey, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    app.log.warn(err, "Redis SET failed");
  }

  return value;
}

/**
 * Invalidate (delete) a cached key.
 */
export async function cacheInvalidate(
  app: FastifyInstance,
  key: string
): Promise<void> {
  const cacheKey = `${KEY_PREFIX}${key}`;

  try {
    await app.redis.del(cacheKey);
    app.log.debug({ key: cacheKey }, "Cache invalidated");
  } catch (err) {
    app.log.warn(err, "Redis DEL failed");
  }
}

/**
 * Invalidate all keys matching a pattern. Uses SCAN (safe for production).
 */
export async function cacheInvalidatePattern(
  app: FastifyInstance,
  pattern: string
): Promise<void> {
  const fullPattern = `${KEY_PREFIX}${pattern}`;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await app.redis.scan(
        cursor,
        "MATCH",
        fullPattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await app.redis.del(...keys);
        app.log.debug(
          { pattern: fullPattern, deleted: keys.length },
          "Cache pattern invalidated"
        );
      }
    } while (cursor !== "0");
  } catch (err) {
    app.log.warn(err, "Redis pattern invalidation failed");
  }
}
