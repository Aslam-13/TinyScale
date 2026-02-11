import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { dbPlugin } from "./plugins/db.plugin.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { rateLimitPlugin } from "./plugins/rate-limit.plugin.js";
import { registerErrorHandler } from "./errors/error-handler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { urlRoutes } from "./modules/url/url.routes.js";
import { statsRoutes } from "./modules/stats/stats.routes.js";
import { apiKeyAuth } from "./middleware/api-key-auth.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: "info",
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Plugins (order matters)
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);

  // Error handler
  registerErrorHandler(app);

  // API key auth as a fallback — runs before authenticate preHandler
  app.addHook("preHandler", async (request, reply) => {
    // Only attempt API key auth if no JWT authorization header
    if (!request.headers.authorization && request.headers["x-api-key"]) {
      await apiKeyAuth(request, reply);
    }
  });

  // Healthcheck
  app.get("/healthcheck", async () => {
    return { status: "ok" };
  });

  // Routes
  await app.register(authRoutes);
  await app.register(urlRoutes);
  await app.register(statsRoutes);

  return app;
}
