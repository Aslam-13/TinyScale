 Day 6-7: Testing with Vitest — Implementation Plan

 Context

 The TinyScale API is fully built (Phases 1-9). Now we add production-quality tests: unit tests for pure utility
 functions and integration tests that hit the real API via app.inject() with a dedicated test database
 (tinyscale_test). This teaches real testing concepts — no mocking the DB, no shortcuts.

 ---
 Source Code Changes (4 files, for testability)

 1. Refactor src/plugins/db.plugin.ts

 Problem: Pool is a module-level singleton in src/db/index.ts. The onClose hook never closes the pool → Vitest hangs
 after tests.
 Fix: Create pool inside the plugin. Close it on app.close(). Each buildApp() gets its own pool.

 2. Simplify src/db/index.ts

 Keep only for migrate.ts. The plugin now owns pool creation.

 3. Modify src/app.ts — accept BuildAppOptions

 Add optional logger param. Tests call buildApp({ logger: false }). Backward-compatible.

 4. Modify src/plugins/rate-limit.plugin.ts

 max: env.NODE_ENV === "test" ? 1000 : 100 — prevents flaky tests from hitting the limit.

 ---
 New Files (11 test files + 5 config/helper files)

 Config & Infrastructure
 ┌──────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────┐
 │             File             │                                     Purpose                                      │
 ├──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ .env.test                    │ DATABASE_URL=postgres://dev:dev@localhost:5432/tinyscale_test, NODE_ENV=test     │
 ├──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ vitest.config.ts             │ Globals, ESM, 30s timeout, sequential execution, loads .env.test before anything │
 ├──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ tests/global-setup.ts        │ Creates tinyscale_test DB if not exists, runs drizzle-kit push                   │
 ├──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ tests/helpers/test-app.ts    │ getTestApp(), closeTestApp(), cleanDatabase() (TRUNCATE CASCADE)                 │
 ├──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ tests/helpers/auth-helper.ts │ createTestUser(), createTestUrl() convenience functions                          │
 └──────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘
 Unit Tests (5 files, co-located with source, no DB needed)
 File: src/utils/short-code.test.ts
 Tests: 8-char length, valid alphabet only, no lookalikes (0/O/1/l/I), uniqueness over 100 calls
 ────────────────────────────────────────
 File: src/utils/api-key.test.ts
 Tests: ts_ prefix, 35-char total length, uniqueness, URL-safe characters
 ────────────────────────────────────────
 File: src/utils/hash.test.ts
 Tests: bcrypt $2b$ format, unique salts, verify correct pw → true, wrong pw → false
 ────────────────────────────────────────
 File: src/errors/app-error.test.ts
 Tests: instanceof Error/AppError, statusCode, isOperational default true / override false
 ────────────────────────────────────────
 File: src/errors/http-errors.test.ts
 Tests: All 5 subclasses: correct status, default msg, custom msg, extends AppError
 Integration Tests (6 files, in tests/, real DB)
 File: tests/healthcheck.integration.test.ts
 Tests: GET /healthcheck → 200 { status: "ok" }
 ────────────────────────────────────────
 File: tests/auth.integration.test.ts
 Tests: Register 201, validation 400, duplicate 409, login 200, wrong pw 401, missing user 401, JWT has userId, apiKey
   starts with ts_
 ────────────────────────────────────────
 File: tests/url.integration.test.ts
 Tests: Shorten 201 (JWT + API key), 401 no auth, 400 invalid URL, redirect 302 + Location header, 404 missing code,
 404
    expired URL
 ────────────────────────────────────────
 File: tests/stats.integration.test.ts
 Tests: 0 clicks returns totalClicks:0, correct count after redirects, clicksByDate/referrers/countries arrays
 ────────────────────────────────────────
 File: tests/api-key-auth.integration.test.ts
 Tests: API key works for shorten + stats, invalid key → 401, no auth → 401
 ────────────────────────────────────────
 File: tests/error-handler.integration.test.ts
 Tests: Validation → 400, not found → 404, error response shape { error, message, statusCode }
 ---
 Test Database Lifecycle

 vitest start
   → globalSetup: CREATE DATABASE tinyscale_test (if not exists) + drizzle-kit push
   → each test file: beforeAll → buildApp(), beforeEach → TRUNCATE CASCADE, afterAll → app.close()
   → globalSetup teardown: no-op (keep DB for debugging)
 vitest exit

 ---
 package.json Scripts

 "test": "vitest run",
 "test:watch": "vitest",
 "test:unit": "vitest run --exclude '**/*.integration.test.ts'",
 "test:integration": "vitest run --include '**/*.integration.test.ts'",
 "test:coverage": "vitest run --coverage"

 ---
 Implementation Order

 1. Install vitest + @vitest/coverage-v8
 2. Refactor db.plugin.ts and db/index.ts
 3. Add BuildAppOptions to app.ts
 4. Add test-env check to rate-limit.plugin.ts
 5. Create .env.test, vitest.config.ts, add "types": ["vitest/globals"] to tsconfig
 6. Create tests/global-setup.ts and helper files
 7. Write 5 unit test files
 8. Write 6 integration test files
 9. Add scripts to package.json, add coverage/ to .gitignore
 10. Run npm test — all green

 Verification

 npm test                  # All 11 files pass
 npm run test:unit         # 5 unit files (fast, ~3s)
 npm run test:integration  # 6 integration files (~15-20s, bcrypt is slow)
 npm run test:coverage     # Coverage report in coverage/