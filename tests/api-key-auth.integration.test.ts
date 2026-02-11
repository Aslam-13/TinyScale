import { getTestApp, closeTestApp, cleanDatabase } from "./helpers/test-app.js";
import { createTestUser, createTestUrl } from "./helpers/auth-helper.js";
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

describe("API Key Authentication", () => {
  it("can shorten a URL with API key", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { "x-api-key": user.apiKey },
      payload: { url: "https://example.com/api-key-shorten" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.shortCode).toBeDefined();
  });

  it("can access stats with API key", async () => {
    const user = await createTestUser(app);
    const url = await createTestUrl(app, user.token);

    const res = await app.inject({
      method: "GET",
      url: `/api/stats/${url.shortCode}`,
      headers: { "x-api-key": user.apiKey },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.shortCode).toBe(url.shortCode);
  });

  it("returns 401 for invalid API key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      headers: { "x-api-key": "ts_invalid_key_12345678901234567" },
      payload: { url: "https://example.com" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with no authentication at all", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/shorten",
      payload: { url: "https://example.com" },
    });

    expect(res.statusCode).toBe(401);
  });
});
