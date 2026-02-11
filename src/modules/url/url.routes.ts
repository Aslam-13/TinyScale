import { type FastifyInstance } from "fastify";
import { ShortenBody, ShortenResponse, RedirectParams } from "./url.schema.js";
import { shortenHandler, redirectHandler } from "./url.handler.js";
import type { ShortenBody as ShortenBodyType, RedirectParams as RedirectParamsType } from "./url.schema.js";

export async function urlRoutes(app: FastifyInstance) {
  // Authenticated route — JWT or API key required
  app.post<{ Body: ShortenBodyType }>(
    "/api/shorten",
    {
      preHandler: [app.authenticate],
      schema: {
        body: ShortenBody,
        response: { 201: ShortenResponse },
      },
    },
    shortenHandler
  );

  // Public redirect route
  app.get<{ Params: RedirectParamsType }>(
    "/:code",
    {
      schema: {
        params: RedirectParams,
      },
    },
    redirectHandler
  );
}
