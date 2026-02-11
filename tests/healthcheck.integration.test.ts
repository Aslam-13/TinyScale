import { getTestApp, closeTestApp } from "./helpers/test-app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await getTestApp();
});

afterAll(async () => {
  await closeTestApp();
});

describe("GET /healthcheck", () => {
  it("returns 200 with { status: 'ok' }", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/healthcheck",
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });
});
