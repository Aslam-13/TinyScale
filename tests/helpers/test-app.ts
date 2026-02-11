import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";

let app: FastifyInstance | null = null;

export async function getTestApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp({ logger: false });
    await app.ready();
  }
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

export async function cleanDatabase(): Promise<void> {
  if (!app) throw new Error("App not initialized — call getTestApp() first");
  await app.db.execute(sql`TRUNCATE TABLE clicks, urls, users CASCADE`);
}
