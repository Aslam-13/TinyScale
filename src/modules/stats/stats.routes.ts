import { type FastifyInstance } from "fastify";
import { StatsParams, StatsResponse } from "./stats.schema.js";
import { statsHandler } from "./stats.handler.js";
import type { StatsParams as StatsParamsType } from "./stats.schema.js";

export async function statsRoutes(app: FastifyInstance) {
  app.get<{ Params: StatsParamsType }>(
    "/api/stats/:code",
    {
      preHandler: [app.authenticate],
      schema: {
        params: StatsParams,
        response: { 200: StatsResponse },
      },
    },
    statsHandler
  );
}
