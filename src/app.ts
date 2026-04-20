import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { dbPlugin } from "./plugins/db.plugin.js";
import { redisPlugin } from "./plugins/redis.plugin.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { rateLimitPlugin } from "./plugins/rate-limit.plugin.js";
import { queuePlugin } from "./plugins/queue.plugin.js";
import { registerErrorHandler } from "./errors/error-handler.js";
import { metricsPlugin } from "./plugins/metrics.plugin.js";
import { queueDepthGauge } from "./plugins/metrics.plugin.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { urlRoutes } from "./modules/url/url.routes.js";
import { statsRoutes } from "./modules/stats/stats.routes.js";
import { apiKeyAuth } from "./middleware/api-key-auth.js";
import { workerStats } from "./jobs/click-worker.js";

export interface BuildAppOptions {
  logger?: boolean | object;
}

export async function buildApp(opts: BuildAppOptions = {}) {
  const app = Fastify({
    logger: opts.logger ?? {
      level: "info",
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Plugins (order matters)
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(queuePlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);

  // Error handler
  registerErrorHandler(app);

  // Metrics (after error handler so it tracks error responses too)
  await app.register(metricsPlugin);

  // API key auth as a fallback — runs before authenticate preHandler
  app.addHook("preHandler", async (request, reply) => {
    // Only attempt API key auth if no JWT authorization header
    if (!request.headers.authorization && request.headers["x-api-key"]) {
      await apiKeyAuth(request, reply);
    }
  });

  // Healthcheck
  app.get("/healthcheck", async (request) => {
    let redisStatus = "disconnected";
    try {
      const pong = await request.server.redis.ping();
      redisStatus = pong === "PONG" ? "connected" : "error";
    } catch {
      redisStatus = "error";
    }

    let queueStatus = "unknown";
    try {
      const counts = await request.server.clickQueue.getJobCounts("waiting", "active", "failed");
      queueStatus = `waiting:${counts.waiting} active:${counts.active} failed:${counts.failed}`;
    } catch {
      queueStatus = "error";
    }

    return {
      status: "ok",
      redis: redisStatus,
      queue: queueStatus,
    };
  });

  // Queue monitoring (admin only in production — fine for dev)
  app.get("/api/queue/stats", async (request) => {
    const counts = await request.server.clickQueue.getJobCounts(
      "active",
      "completed",
      "failed",
      "delayed",
      "waiting"
    );

    return {
      queue: "clicks",
      // BullMQ's view — "did the job enter the buffer?"
      bullmq: counts,
      // Worker's view — "did the clicks actually reach Postgres?"
      worker: workerStats,
    };
  });

  // Routes
  await app.register(authRoutes);
  await app.register(urlRoutes);
  await app.register(statsRoutes);

  // Update queue depth metrics every 30 seconds
  setInterval(async () => {
    try {
      const counts = await app.clickQueue.getJobCounts(
        "waiting", "active", "failed"
      );
      queueDepthGauge.set({ state: "waiting" }, counts.waiting);
      queueDepthGauge.set({ state: "active" }, counts.active);
      queueDepthGauge.set({ state: "failed" }, counts.failed);
    } catch {
      // Queue might not be ready yet
    }
  }, 30000);

  return app;
}
