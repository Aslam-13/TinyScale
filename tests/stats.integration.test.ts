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

describe("GET /api/stats/:code", () => {
  it("returns 0 clicks for a fresh URL", async () => {
    const user = await createTestUser(app);
    const url = await createTestUrl(app, user.token);

    const res = await app.inject({
      method: "GET",
      url: `/api/stats/${url.shortCode}`,
      headers: { authorization: `Bearer ${user.token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.shortCode).toBe(url.shortCode);
    expect(body.originalUrl).toBe("https://example.com");
    expect(body.totalClicks).toBe(0);
    expect(body.clicksByDate).toEqual([]);
    expect(body.referrers).toEqual([]);
    expect(body.countries).toEqual([]);
  });

  it("returns correct count after redirects", async () => {
    const user = await createTestUser(app);
    const url = await createTestUrl(app, user.token, "https://example.com/counted");

    // Trigger 3 redirects
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: "GET",
        url: `/${url.shortCode}`,
      });
    }

    // Small delay to let fire-and-forget click recording complete
    await new Promise((r) => setTimeout(r, 200));

    const res = await app.inject({
      method: "GET",
      url: `/api/stats/${url.shortCode}`,
      headers: { authorization: `Bearer ${user.token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalClicks).toBe(3);
  });

  it("returns clicksByDate, referrers, and countries arrays", async () => {
    const user = await createTestUser(app);
    const url = await createTestUrl(app, user.token, "https://example.com/arrays");

    // Trigger a redirect with a referrer header
    await app.inject({
      method: "GET",
      url: `/${url.shortCode}`,
      headers: { referer: "https://google.com" },
    });

    await new Promise((r) => setTimeout(r, 200));

    const res = await app.inject({
      method: "GET",
      url: `/api/stats/${url.shortCode}`,
      headers: { authorization: `Bearer ${user.token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalClicks).toBe(1);
    expect(Array.isArray(body.clicksByDate)).toBe(true);
    expect(body.clicksByDate.length).toBeGreaterThan(0);
    expect(Array.isArray(body.referrers)).toBe(true);
    expect(Array.isArray(body.countries)).toBe(true);
  });

  it("returns 401 without authentication", async () => {
    const user = await createTestUser(app);
    const url = await createTestUrl(app, user.token);

    const res = await app.inject({
      method: "GET",
      url: `/api/stats/${url.shortCode}`,
    });

    expect(res.statusCode).toBe(401);
  });
});
