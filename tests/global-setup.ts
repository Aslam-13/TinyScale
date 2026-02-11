import pg from "pg";
import { execSync } from "child_process";

const ADMIN_URL = "postgres://dev:dev@localhost:5432/postgres";
const TEST_DB = "tinyscale_test";

export async function setup() {
  // 1. Create test database if it doesn't exist
  const client = new pg.Client({ connectionString: ADMIN_URL });
  await client.connect();

  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [TEST_DB]
  );

  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE ${TEST_DB}`);
    console.log(`Created database: ${TEST_DB}`);
  } else {
    console.log(`Database ${TEST_DB} already exists`);
  }

  await client.end();

  // 2. Push schema to test database using drizzle-kit
  execSync(
    `npx drizzle-kit push --dialect postgresql --schema ./src/db/schema/tables.ts --url postgres://dev:dev@localhost:5432/${TEST_DB}`,
    { stdio: "inherit" }
  );

  console.log("Test database schema pushed successfully");
}

export async function teardown() {
  // Keep DB around for debugging — no-op
}
