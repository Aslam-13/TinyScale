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

describe("POST /api/auth/register", () => {
  it("returns 201 with user, token, and apiKey", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "new@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("new@example.com");
    expect(body.user.id).toBeDefined();
    expect(body.token).toBeDefined();
    expect(body.apiKey).toBeDefined();
  });

  it("returns apiKey starting with ts_", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "key@example.com", password: "password123" },
    });

    const body = JSON.parse(res.body);
    expect(body.apiKey.startsWith("ts_")).toBe(true);
  });

  it("returns 400 for invalid email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "not-an-email", password: "password123" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "test@example.com", password: "short" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "dupe@example.com", password: "password123" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "dupe@example.com", password: "password456" },
    });

    expect(res.statusCode).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "login@example.com", password: "password123" },
    });
  });

  it("returns 200 with user and token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "login@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("login@example.com");
    expect(body.token).toBeDefined();
  });

  it("JWT token contains userId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "login@example.com", password: "password123" },
    });

    const body = JSON.parse(res.body);
    // Decode JWT payload (middle segment)
    const payload = JSON.parse(
      Buffer.from(body.token.split(".")[1], "base64url").toString()
    );
    expect(payload.userId).toBe(body.user.id);
  });

  it("returns 401 for wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "login@example.com", password: "wrongpassword" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for non-existent user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "nobody@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(401);
  });
});
