import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgres://dev:dev@localhost:5432/tinyscale_test",
      JWT_SECRET: "test-secret-key-not-for-production",
      PORT: "3000",
      HOST: "0.0.0.0",
      NODE_ENV: "test",
    },
    globalSetup: "./tests/global-setup.ts",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/db/migrate.ts"],
    },
  },
});
