import fp from "fastify-plugin";
import { type FastifyInstance } from "fastify";
import Redis from "ioredis";
import { env } from "../config/env.js";

// Extend Fastify's type system so app.redis is available everywhere
declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redis = new Redis(env.REDIS_URL, {
    // If Redis is unreachable, retry 3 times before giving up on a request.
    // BullMQ requires this to be null (we'll handle that separately in Day 5-6).
    maxRetriesPerRequest: 3,

    retryStrategy(times) {
      // Exponential-ish backoff: 200ms, 400ms, ... max 5000ms
      const delay = Math.min(times * 200, 5000);
      fastify.log.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
      return delay;
    },

    // Connect immediately when created (vs. lazy on first command)
    lazyConnect: false,
  });

  // Log connection lifecycle events
  redis.on("connect", () => {
    fastify.log.info("Redis connected");
  });

  redis.on("error", (err) => {
    // DON'T throw — let the app continue without Redis (graceful degradation)
    fastify.log.error(err, "Redis connection error");
  });

  redis.on("close", () => {
    fastify.log.warn("Redis connection closed");
  });

  // Decorate Fastify so handlers can use request.server.redis
  fastify.decorate("redis", redis);

  // Clean up on app shutdown — graceful QUIT instead of forceful disconnect
  fastify.addHook("onClose", async () => {
    fastify.log.info("Closing Redis connection");
    await redis.quit();
  });
});
