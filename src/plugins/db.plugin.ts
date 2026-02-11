import fp from "fastify-plugin";
import { type FastifyInstance } from "fastify";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "../db/schema/index.js";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

export const dbPlugin = fp(async (fastify: FastifyInstance) => {
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
  });

  const db = drizzle(pool, { schema });
  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    fastify.log.info("Closing database connection pool");
    await pool.end();
  });
});
