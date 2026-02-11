import { type FastifyRequest, type FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "../db/schema/index.js";

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip if already authenticated via JWT
  if (request.user?.userId) return;

  const apiKey = request.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid authentication",
      statusCode: 401,
    });
  }

  const [user] = await request.server.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .limit(1);

  if (!user) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid API key",
      statusCode: 401,
    });
  }

  // Attach user to request as if JWT-authenticated
  request.user = { userId: user.id };
}
