import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { env } from "../config/env.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "7d" },
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Already authenticated via API key middleware
      if (request.user?.userId) return;

      // Try JWT
      if (request.headers.authorization) {
        try {
          await request.jwtVerify();
          return;
        } catch {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid or expired token",
            statusCode: 401,
          });
        }
      }

      // No auth provided
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing authentication — provide Bearer token or x-api-key header",
        statusCode: 401,
      });
    }
  );
});
