import { getTestApp, closeTestApp, cleanDatabase } from "./helpers/test-app.js";
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

describe("Error Handler", () => {
  it("returns 400 with correct shape for validation errors", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "not-valid", password: "short" },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("statusCode", 400);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/this-route-does-not-exist",
    });

    expect(res.statusCode).toBe(404);
  });

  it("error response has { error, message, statusCode } shape", async () => {
    // Trigger a 404 via a non-existent short code
    const res = await app.inject({
      method: "GET",
      url: "/zzzzzzzz",
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("statusCode", 404);
  });
});
