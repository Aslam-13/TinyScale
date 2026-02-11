import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { type FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export const rateLimitPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    max: env.NODE_ENV === "test" ? 1000 : 100,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      // Key by API key if present, otherwise by IP
      const apiKey = request.headers["x-api-key"];
      if (typeof apiKey === "string") return apiKey;
      return request.ip;
    },
  });
});
