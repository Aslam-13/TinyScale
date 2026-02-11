import { getTestApp, closeTestApp, cleanDatabase } from "./helpers/test-app.js";
import { createTestUser } from "./helpers/auth-helper.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await getTestApp();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await closeTestApp();
});

describe("POST /api/shorten", () => {
  it("returns 201 with short URL when using JWT", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { url: "https://example.com/long-path" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.shortCode).toBeDefined();
    expect(body.shortUrl).toContain(body.shortCode);
    expect(body.originalUrl).toBe("https://example.com/long-path");
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  it("returns 201 with short URL when using API key", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { "x-api-key": user.apiKey },
      payload: { url: "https://example.com/api-key-test" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.shortCode).toBeDefined();
    expect(body.originalUrl).toBe("https://example.com/api-key-test");
  });

  it("returns 401 without authentication", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      payload: { url: "https://example.com" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for invalid URL", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { url: "not-a-valid-url" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /:code (redirect)", () => {
  it("returns 302 with Location header", async () => {
    const user = await createTestUser(app);

    const shortenRes = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { url: "https://example.com/redirect-target" },
    });

    const { shortCode } = JSON.parse(shortenRes.body);

    const res = await app.inject({
      method: "GET",
      url: `/${shortCode}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://example.com/redirect-target");
  });

  it("returns 404 for non-existent code", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/nonexist",
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for expired URL", async () => {
    const user = await createTestUser(app);

    // Create a URL that expired in the past
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const shortenRes = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { url: "https://example.com/expired", expiresAt: pastDate },
    });

    const { shortCode } = JSON.parse(shortenRes.body);

    const res = await app.inject({
      method: "GET",
      url: `/${shortCode}`,
    });

    expect(res.statusCode).toBe(404);
  });
});
