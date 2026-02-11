 TinyScale API — Day 3-5 Implementation Plan

 Context

 Building the core TinyScale URL shortener API from scratch (Day 3-5 of Week 1 roadmap). PostgreSQL is installed
 locally but no database/schema exists. The project directory is empty except for README.md. Goal: production-quality
 TypeScript API with Fastify + Drizzle ORM.

 ---
 Project Structure

 TinyScale/
 ├── src/
 │   ├── server.ts                     # Entry point — starts the server
 │   ├── app.ts                        # Fastify app factory (testable, no side effects)
 │   ├── config/
 │   │   └── env.ts                    # Env var loading + validation (fail-fast)
 │   ├── db/
 │   │   ├── index.ts                  # Drizzle client + connection pool
 │   │   ├── migrate.ts                # Programmatic migration runner
 │   │   └── schema/
 │   │       ├── users.ts              # users table
 │   │       ├── urls.ts               # urls table (FK → users)
 │   │       ├── clicks.ts             # clicks table (FK → urls)
 │   │       └── index.ts              # Re-exports + Drizzle relations
 │   ├── modules/
 │   │   ├── auth/
 │   │   │   ├── auth.routes.ts        # POST /api/auth/register, /login
 │   │   │   ├── auth.handler.ts       # Thin handlers → delegate to service
 │   │   │   ├── auth.service.ts       # Business logic (hash, JWT, API key)
 │   │   │   └── auth.schema.ts        # TypeBox request/response schemas
 │   │   ├── url/
 │   │   │   ├── url.routes.ts         # POST /api/shorten, GET /:code
 │   │   │   ├── url.handler.ts
 │   │   │   ├── url.service.ts        # Short code generation + collision handling
 │   │   │   └── url.schema.ts
 │   │   └── stats/
 │   │       ├── stats.routes.ts       # GET /api/stats/:code
 │   │       ├── stats.handler.ts
 │   │       ├── stats.service.ts      # Click aggregation queries
 │   │       └── stats.schema.ts
 │   ├── plugins/
 │   │   ├── auth.plugin.ts            # JWT setup + authenticate decorator
 │   │   ├── rate-limit.plugin.ts      # In-memory rate limiting per API key/IP
 │   │   └── db.plugin.ts              # Decorates fastify with drizzle db
 │   ├── errors/
 │   │   ├── app-error.ts              # Base AppError class (statusCode + isOperational)
 │   │   ├── http-errors.ts            # NotFoundError, BadRequestError, etc.
 │   │   └── error-handler.ts          # Single setErrorHandler — maps errors → HTTP responses
 │   ├── middleware/
 │   │   └── api-key-auth.ts           # preHandler: validates x-api-key header
 │   └── utils/
 │       ├── short-code.ts             # nanoid with custom URL-safe alphabet, 8 chars
 │       ├── api-key.ts                # Generates "ts_" prefixed API keys
 │       └── hash.ts                   # bcrypt wrapper (hashPassword, verifyPassword)
 ├── drizzle/                          # Generated migration SQL files
 ├── drizzle.config.ts                 # Drizzle Kit configuration
 ├── tsconfig.json                     # Strict mode, ESM, NodeNext
 ├── package.json                      # "type": "module"
 ├── .env.example                      # Template (committed)
 ├── .env                              # Local values (gitignored)
 └── .gitignore

 Why vertical slices (modules/): Each feature is self-contained. When you open modules/url/, everything about URL
 shortening is right there — routes, handler, service, schema. Scales far better than horizontal
 controllers/services/models split.

 Why app.ts vs server.ts separation: app.ts creates the Fastify instance without starting it. Tests import the factory
 and inject requests without starting a real server.

 ---
 Implementation Phases (in order)

 Phase 1: Project Skeleton

 - package.json — npm init + install all dependencies
 - tsconfig.json — strict, ESM, NodeNext module resolution
 - .gitignore — node_modules, dist, .env
 - .env.example + .env — DATABASE_URL, JWT_SECRET, PORT, etc.
 - src/config/env.ts — load + validate env vars at startup (fail-fast)
 - src/app.ts — bare Fastify factory with logger
 - src/server.ts — import factory, listen on port

 Phase 2: Database Layer

 - Schema files: users.ts, urls.ts, clicks.ts, schema/index.ts
 - drizzle.config.ts — points to schema, PostgreSQL dialect
 - src/db/index.ts — connection pool (max: 20) + drizzle client
 - src/db/migrate.ts — migration runner
 - src/plugins/db.plugin.ts — decorates fastify instance with db
 - Create the tinyscale database, run db:push to create tables

 Phase 3: Error Handling

 - AppError base class with statusCode + isOperational flag
 - HTTP error subclasses: BadRequest(400), Unauthorized(401), NotFound(404), Conflict(409), RateLimit(429)
 - Central error handler: AppError → proper response, validation error → 400, unknown → 500 (never leaks internals)

 Phase 4: Utilities

 - hash.ts — bcrypt (salt rounds: 12)
 - short-code.ts — nanoid with custom alphabet (no lookalikes: 0/O, 1/l/I removed), 8 chars
 - api-key.ts — "ts_" + nanoid(32)

 Phase 5: Auth Module

 - auth.plugin.ts — registers @fastify/jwt, exposes fastify.authenticate preHandler
 - auth.schema.ts — TypeBox: RegisterBody, LoginBody, AuthResponse
 - auth.service.ts — register (check dupe, hash pw, gen API key), login (verify, sign JWT)
 - auth.handler.ts + auth.routes.ts
 - api-key-auth.ts — preHandler that validates x-api-key header as alternative to JWT

 Phase 6: URL Module

 - url.schema.ts — ShortenBody (url + optional expiresAt), RedirectParams
 - url.service.ts — createShortUrl (with collision retry up to 5 attempts), resolveShortCode, recordClick
 - url.handler.ts + url.routes.ts
 - GET /:code uses fire-and-forget click recording (don't await — redirect is the hot path)
 - Redirect uses 302 (not 301) so every click hits the server for accurate analytics

 Phase 7: Stats Module

 - stats.schema.ts — StatsResponse with totalClicks, clicksByDate, referrers, countries
 - stats.service.ts — SQL aggregation queries
 - stats.handler.ts + stats.routes.ts

 Phase 8: Rate Limiting

 - rate-limit.plugin.ts — @fastify/rate-limit, in-memory store
 - Key by x-api-key header if present, otherwise by IP
 - Default: 100 req/60s for API, 1000 req/60s for redirects
 - Returns 429 with Retry-After header

 Phase 9: Wire in app.ts

 - Register plugins in order: db → auth → rate-limit → error handler
 - Register routes: auth → url → stats
 - Add GET /healthcheck

 ---
 Key Design Decisions
 Decision: Framework
 Choice: Fastify v5
 Why: Faster than Express, native validation, TypeScript-first
 ────────────────────────────────────────
 Decision: ORM
 Choice: Drizzle ORM
 Why: SQL-like API — you see the actual queries generated
 ────────────────────────────────────────
 Decision: Validation
 Choice: TypeBox
 Why: Compiles to JSON Schema (Fastify-native AJV), gives static types for free
 ────────────────────────────────────────
 Decision: Short codes
 Choice: nanoid custom alphabet, 8 chars
 Why: 54^8 = ~72B combinations, cryptographically secure
 ────────────────────────────────────────
 Decision: Collision handling
 Choice: DB unique constraint + retry loop (max 5)
 Why: Database is source of truth, app handles gracefully
 ────────────────────────────────────────
 Decision: Auth
 Choice: JWT (7d expiry) + API key (x-api-key header)
 Why: JWT for browser clients, API key for machine-to-machine
 ────────────────────────────────────────
 Decision: Password hashing
 Choice: bcrypt, 12 salt rounds
 Why: Industry standard, deliberately slow
 ────────────────────────────────────────
 Decision: Error handling
 Choice: Typed error classes + single central handler
 Why: Throw anywhere, catch once — clean and consistent
 ────────────────────────────────────────
 Decision: Click recording
 Choice: Fire-and-forget (no await on redirect)
 Why: Redirect latency > analytics completeness
 ────────────────────────────────────────
 Decision: Module format
 Choice: ESM ("type": "module")
 Why: Modern standard, required by nanoid v5
 ---
 Dependencies

 Production: fastify, @fastify/jwt, @fastify/rate-limit, @fastify/sensible, @fastify/type-provider-typebox,
 @sinclair/typebox, drizzle-orm, pg, bcrypt, nanoid, dotenv

 Dev: typescript, @types/node, @types/pg, @types/bcrypt, drizzle-kit, tsx, pino-pretty

 ---
 Verification

 After implementation, test with curl:
 1. GET /healthcheck → { status: "ok" }
 2. POST /api/auth/register → 201 with user + token + apiKey
 3. POST /api/auth/login → 200 with token
 4. POST /api/shorten (with JWT or x-api-key) → 201 with shortCode
 5. GET /:code → 302 redirect to original URL
 6. GET /api/stats/:code → 200 with click analytics
 7. POST /api/shorten with empty body → 400 validation error
 8. GET /nonexistent → 404
 9. Rapid-fire 110 requests → first 100 succeed, then 429
 10. Verify in psql: \dt, SELECT * FROM users/urls/clicks, EXPLAIN ANALYZE shows index scans