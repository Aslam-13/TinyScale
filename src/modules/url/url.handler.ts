import { type FastifyRequest, type FastifyReply } from "fastify";
import { createShortUrl, resolveShortCode } from "./url.service.js";
import type { ShortenBody, RedirectParams } from "./url.schema.js";
import { env } from "../../config/env.js";

export async function shortenHandler(
  request: FastifyRequest<{ Body: ShortenBody }>,
  reply: FastifyReply
) {
  const url = await createShortUrl(
    request.server,
    request.user.userId,
    request.body.url,
    request.body.expiresAt
  );

  const shortUrl = `http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}/${url.shortCode}`;

  return reply.status(201).send({
    id: url.id,
    shortCode: url.shortCode,
    shortUrl,
    originalUrl: url.originalUrl,
    expiresAt: url.expiresAt?.toISOString() ?? null,
    createdAt: url.createdAt.toISOString(),
  });
}

export async function redirectHandler(
  request: FastifyRequest<{ Params: RedirectParams }>,
  reply: FastifyReply
) {
  const url = await resolveShortCode(request.server, request.params.code);

  // Push click to BullMQ queue — worker will batch-insert to Postgres later
  request.server.clickQueue
    .add("click", {
      urlId: url.id,
      shortCode: url.shortCode,
      referrer: request.headers.referer ?? (request.headers.referrer as string | undefined) ?? null,
      userAgent: request.headers["user-agent"] ?? null,
      ip: request.ip ?? null,
      clickedAt: new Date().toISOString(),
    })
    .catch((err) => request.log.error(err, "Failed to enqueue click"));

  // Redirect immediately — don't wait for the queue
  return reply.redirect(url.originalUrl);
}
