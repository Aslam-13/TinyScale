import { type FastifyRequest, type FastifyReply } from "fastify";
import { registerUser, loginUser } from "./auth.service.js";
import type { RegisterBody, LoginBody } from "./auth.schema.js";

export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  const result = await registerUser(request.server, request.body);
  return reply.status(201).send(result);
}

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  const result = await loginUser(request.server, request.body);
  return reply.status(200).send(result);
}
