import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

// Standalone pool for migrations and scripts (not used by the Fastify app)
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
