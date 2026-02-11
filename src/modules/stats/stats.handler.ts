import { type FastifyRequest, type FastifyReply } from "fastify";
import { getUrlStats } from "./stats.service.js";
import type { StatsParams } from "./stats.schema.js";

export async function statsHandler(
  request: FastifyRequest<{ Params: StatsParams }>,
  reply: FastifyReply
) {
  const stats = await getUrlStats(request.server, request.params.code);
  return reply.status(200).send(stats);
}
