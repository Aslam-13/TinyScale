import type { FastifyInstance } from "fastify";

let counter = 0;

export async function createTestUser(app: FastifyInstance) {
  counter++;
  const email = `test${counter}-${Date.now()}@example.com`;
  const password = "password123";

  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email, password },
  });

  const body = JSON.parse(res.body);
  return {
    email,
    password,
    token: body.token as string,
    apiKey: body.apiKey as string,
    userId: body.user.id as string,
  };
}

export async function createTestUrl(
  app: FastifyInstance,
  token: string,
  url = "https://example.com"
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/shorten",
    headers: { authorization: `Bearer ${token}` },
    payload: { url },
  });

  const body = JSON.parse(res.body);
  return {
    id: body.id as string,
    shortCode: body.shortCode as string,
    shortUrl: body.shortUrl as string,
    originalUrl: body.originalUrl as string,
  };
}
