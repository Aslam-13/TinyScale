# 3-Month Real Engineering Roadmap
### From CRUD Developer to Someone Who Actually Understands How Things Work

---

## First — Let's Kill the Confusion

**Primary language: TypeScript (Node.js backend)**
You already know JS. Don't switch. Go deeper. TypeScript forces you to think about types, interfaces, contracts — things real engineers care about. You'll use this for your main project.

**Secondary language: Go**
Not Java. Not Rust. Go is simple, fast, used everywhere in infrastructure (Docker, Kubernetes, Prometheus — all written in Go). You'll pick it up in Week 3-4 and use it for small tools.

**Database: PostgreSQL (drop MongoDB for now)**
MongoDB let you get away without understanding data modeling. Postgres will force you to think about schemas, indexes, joins, transactions, constraints. This is where real backend engineering lives.

**Stop using: Create React App, random boilerplate generators, MongoDB for everything**

---

## The One Project That Ties Everything Together

You're going to build **"TinyScale" — a URL shortener + analytics platform.**

"A URL shortener? Seriously?" — Yes. Because a URL shortener is deceptively simple on the surface but touches EVERY real engineering concept when you build it properly:

- High-throughput writes (every click = a write)
- Read-heavy traffic (redirects)
- Analytics pipeline (process click data async)
- Caching (Redis)
- Search (Elasticsearch for analytics)
- Message queues (Kafka/RabbitMQ for async processing)
- Rate limiting, auth, API design
- Containerization, reverse proxy, monitoring
- Load testing to find where it breaks

This is NOT a tutorial project. You're going to build it like a real production system, break it, fix it, and learn from every failure.

---

## Month 1: Foundations That Actually Matter (Weeks 1-4)

### Week 1: PostgreSQL + Proper API Design

**Goal:** Build the core URL shortener API with proper engineering practices.

**Day 1-2: PostgreSQL fundamentals**
- Install Postgres locally (not a cloud service — understand what's running on your machine)
- Learn: CREATE TABLE, indexes, constraints, foreign keys, joins, EXPLAIN ANALYZE
- Resource: https://www.postgresqltutorial.com (free, practical)
- Do this: Design the schema for TinyScale
  ```
  urls table: id, short_code (unique index), original_url, user_id, created_at, expires_at
  clicks table: id, url_id (foreign key), ip_address, user_agent, referrer, country, clicked_at
  users table: id, email, api_key, created_at
  ```
- Run EXPLAIN ANALYZE on your queries. Understand what a sequential scan vs index scan means.

**Day 3-5: Build the API in TypeScript**
- Use Fastify (not Express — Fastify is faster, has built-in validation, better TypeScript support)
- Use Drizzle ORM or Kysely (not Prisma — these are closer to SQL, you'll actually learn what queries run)
- Endpoints:
  - POST /api/shorten — create short URL
  - GET /:code — redirect (this is the hot path)
  - GET /api/stats/:code — get click analytics
  - POST /api/auth/register, /api/auth/login
- Write input validation. Handle errors properly (not just try-catch-500).
- Add rate limiting per API key (in-memory for now, you'll move it to Redis later)

**Day 6-7: Testing**
- Write actual tests. Use Vitest.
- Unit tests for your URL shortening logic (hash generation, collision handling)
- Integration tests that hit your API with a real test database
- Learn: What's the difference between unit, integration, and e2e tests? Why do you need each?

**Checkpoint:** You should have a working URL shortener backed by Postgres with tests. No frontend needed — use curl or Postman.

---

### Week 2: Docker + Nginx + Proper Deployment

**Goal:** Containerize your app and understand what happens between "user types URL" and "your code runs."

**Day 1-2: Docker (not just docker-compose up)**
- Read: What is a container? How is it different from a VM? What are namespaces and cgroups? (You don't need to memorize — just understand the concept)
- Write a Dockerfile for your app FROM SCRATCH. No copy-pasting.
  - Multi-stage build (build stage + production stage)
  - Understand: Why multi-stage? What's the difference in image size?
  - Understand: What's a layer? Why does order of commands matter?
- Write docker-compose.yml with your app + Postgres
- Understand volumes (your data persists where?), networks (how do containers talk to each other?), environment variables

**Day 3-4: Nginx as reverse proxy**
- Set up Nginx in front of your app
- Understand: What does a reverse proxy do? Why not just expose your Node app directly?
- Configure:
  - Proxy pass to your app
  - Gzip compression
  - Static file serving
  - Rate limiting at Nginx level
  - SSL with self-signed cert (understand what TLS handshake does)
  - Basic caching headers
- Add Nginx to your docker-compose

**Day 5-6: Networking fundamentals**
- Understand: What happens when someone types a URL in the browser?
  - DNS resolution → TCP handshake → TLS handshake → HTTP request → Nginx → your app → database → response
  - Use `curl -v` to see the headers. Use `dig` to see DNS. Use `tcpdump` or Wireshark to see packets.
- Understand: What's the difference between HTTP/1.1 and HTTP/2? What's keep-alive? What's connection pooling?

**Day 7: Load test your setup**
- Install k6 (https://k6.io — free, scriptable in JS)
- Write a load test: 100 concurrent users creating short URLs and clicking them
- Watch what happens. Where does it break first? Database connections? Node event loop? Nginx?
- This is your first taste of "production-like" problems even on your laptop.

**Checkpoint:** Your app runs in Docker behind Nginx. You've load-tested it and found at least one bottleneck.

---

### Week 3: Redis + Caching + Background Jobs

**Goal:** Understand why caching exists and implement it properly.

**Day 1-2: Redis fundamentals**
- Install Redis (add to docker-compose)
- Learn Redis data structures: strings, hashes, sorted sets, lists, sets — NOT just GET/SET
- Use redis-cli to play around
- Understand: Redis is single-threaded. Why is it still fast? (Event loop, in-memory, no disk I/O on reads)

**Day 3-4: Add caching to TinyScale**
- Cache the redirect lookup (short_code → original_url)
  - Implement cache-aside pattern: check Redis first, if miss → query Postgres → store in Redis
  - Set TTL. Understand: What happens when the URL is updated? (Cache invalidation — the hardest problem in CS)
- Cache API rate limiting in Redis (move from in-memory)
  - Use Redis INCR + EXPIRE for sliding window rate limiting
- Add Redis-based session storage for auth

**Day 5-6: Background job processing**
- Install BullMQ (Redis-based job queue for Node.js)
- Move click tracking to a background job:
  - When someone clicks a short URL, don't write to Postgres immediately
  - Push the click event to a BullMQ queue
  - A worker process picks it up and writes to the database
  - Why? The redirect (user-facing) should be FAST. The analytics write can happen async.
- Implement: retry logic, dead letter queue (what happens when a job fails 3 times?)

**Day 7: Measure the improvement**
- Run the same k6 load test from Week 2
- Compare: How much faster are redirects now with Redis caching?
- Compare: How much more throughput can you handle with async click processing?
- Write these numbers down. This is what goes on your resume.

**Checkpoint:** Redis caching + async job processing working. Measurable performance improvement documented.

---

### Week 4: Go Basics + CLI Tool + Understanding Your System

**Goal:** Learn Go basics and build something real with it. Start reading other people's code.

**Day 1-3: Go crash course**
- Install Go. Read "A Tour of Go" (https://go.dev/tour/) — it's interactive and takes ~4 hours
- Build a CLI tool for TinyScale in Go:
  - `tinyscale shorten https://example.com` → calls your API, returns short URL
  - `tinyscale stats abc123` → shows click stats
  - `tinyscale health` → checks if API, Redis, Postgres are all up
- Use only the standard library (net/http, encoding/json, flag or os.Args)
- This teaches you: Go syntax, HTTP clients, JSON parsing, error handling, building binaries

**Day 4-5: Monitoring and observability**
- Add to your docker-compose:
  - Prometheus (metrics collection)
  - Grafana (visualization)
- Add metrics to your Node app using prom-client:
  - Request count, request duration (histogram), active connections
  - Redis hit/miss ratio
  - Queue depth (how many jobs pending?)
- Create a Grafana dashboard that shows these metrics
- This is what "production monitoring" looks like. Every real company uses something like this.

**Day 6-7: Read real code**
- Go read the source code of BullMQ (you're already using it): https://github.com/taskforcesh/bullmq
  - Don't read everything. Read how it creates a job, how the worker picks it up, how retry works.
  - You'll learn patterns you never would from tutorials.
- Go read how Fastify handles requests: https://github.com/fastify/fastify
  - Read the routing logic. How does it match URLs so fast? (Radix tree / find-my-way)

**Checkpoint:** Go CLI tool working. Prometheus + Grafana monitoring your app. You've read real library source code.

---

## Month 2: The Infrastructure Layer (Weeks 5-8)

### Week 5: Message Queues (Kafka) + Event-Driven Architecture

**Goal:** Replace BullMQ with Kafka for the analytics pipeline. Understand why distributed messaging matters.

**Day 1-2: Kafka concepts**
- Use Confluent's free Docker images to run Kafka locally
- Understand: Topics, partitions, consumer groups, offsets, producers, consumers
- Understand: How is Kafka different from Redis queues? (Durability, replay, ordering, throughput)
- Use kafkacat/kcat CLI to produce and consume messages manually

**Day 3-5: Implement Kafka in TinyScale**
- Replace BullMQ click tracking with Kafka:
  - Producer: When a click happens, produce an event to `clicks` topic
  - Consumer 1: Writes click data to Postgres (same as before, but now via Kafka)
  - Consumer 2: Aggregates click counts per URL per hour and stores in a summary table
  - Consumer 3: (Week 6) Indexes click data into Elasticsearch
- Understand: What happens when a consumer crashes? (Consumer group rebalancing, offset commits)
- Understand: What happens when you have more consumers than partitions?

**Day 6-7: Error handling in distributed systems**
- What if Kafka is down? Your redirect should still work (graceful degradation)
- What if the consumer crashes mid-processing? (At-least-once delivery, idempotency)
- Implement: Dead letter topic for failed events
- Read: https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/

**Checkpoint:** Kafka pipeline running. Multiple consumers processing click events. Error handling in place.

---

### Week 6: Elasticsearch + Search + Analytics Dashboard

**Goal:** Add search and analytics capabilities. Understand how search engines work at a basic level.

**Day 1-2: Elasticsearch basics**
- Add Elasticsearch to docker-compose
- Understand: What's an index? What's a document? How is it different from a database? (Inverted index)
- Use Kibana (add to docker-compose) to explore data visually
- Create an index mapping for click events:
  ```json
  {
    "short_code": "keyword",
    "original_url": "text",
    "country": "keyword",
    "user_agent": "text",
    "clicked_at": "date",
    "referrer": "keyword"
  }
  ```

**Day 3-4: Connect Kafka → Elasticsearch**
- Your Consumer 3 from Week 5 reads click events from Kafka and indexes them into Elasticsearch
- Build analytics API endpoints:
  - GET /api/analytics/:code — clicks over time (date histogram aggregation)
  - GET /api/analytics/:code/countries — clicks by country (terms aggregation)
  - GET /api/analytics/:code/referrers — top referrers
  - GET /api/search?q=... — full-text search across URLs

**Day 5-6: Build a simple analytics dashboard**
- Yes, use React. But this time, use it with purpose.
- Chart.js or Recharts for visualizations
- Real-time updates using Server-Sent Events (SSE) — NOT WebSocket (simpler, sufficient here)
- Show: click graphs, geographic distribution, top referrers, real-time click stream

**Day 7: Query optimization**
- Run Elasticsearch queries and look at response times
- Understand: What's a filter context vs query context? Why does it matter for performance?
- Understand: What happens when your Elasticsearch index grows to millions of documents? (Sharding)

**Checkpoint:** Full analytics pipeline working: Clicks → Kafka → Elasticsearch → API → Dashboard

---

### Week 7: Kubernetes Basics + Deploying Properly

**Goal:** Move from docker-compose to Kubernetes. Understand orchestration.

**Day 1-2: Kubernetes concepts (BEFORE touching kubectl)**
- Read/watch: What problem does Kubernetes solve that Docker alone doesn't?
  - Service discovery, scaling, self-healing, rolling updates, resource management
- Understand these concepts FIRST: Pod, Deployment, Service, Ingress, ConfigMap, Secret, Namespace, PersistentVolumeClaim
- Resource: "Kubernetes in Action" chapters 1-3 (or Nana's YouTube Kubernetes crash course — free, ~4 hours)

**Day 3-4: Set up local Kubernetes**
- Install minikube or kind (Kubernetes in Docker)
- Convert your docker-compose to Kubernetes manifests:
  - Deployment + Service for your Node app (3 replicas)
  - StatefulSet for Postgres (understand why StatefulSet, not Deployment)
  - Deployment for Redis
  - Ingress for routing (replaces your Nginx reverse proxy)
  - ConfigMaps for configuration, Secrets for passwords
- Deploy everything. Use `kubectl logs`, `kubectl describe`, `kubectl exec` to debug.

**Day 5-6: Kubernetes features that matter**
- Horizontal Pod Autoscaler: Auto-scale your app based on CPU/request count
- Liveness and readiness probes: How does K8s know your app is healthy?
- Resource limits: What happens when your app uses too much memory? (OOMKilled — you'll see this)
- Rolling updates: Deploy a new version with zero downtime
- Run your k6 load test while doing a rolling update. Does any request fail?

**Day 7: Understanding what just happened**
- Draw the architecture diagram of your system now:
  - User → Ingress → App Service → App Pods (3) → Redis / Postgres / Kafka / Elasticsearch
  - Kafka → Consumer Pods → Postgres + Elasticsearch
- This diagram is what you show in interviews when they ask about system design.

**Checkpoint:** TinyScale running on local Kubernetes. Auto-scaling, health checks, rolling updates working.

---

### Week 8: CI/CD + Testing Pipeline + Security Basics

**Goal:** Automate everything. Never deploy manually again.

**Day 1-2: GitHub Actions CI/CD**
- Set up a pipeline:
  1. On push: Run linter (ESLint), type check (tsc), run tests
  2. On PR merge to main: Build Docker image, push to GitHub Container Registry
  3. (Optional) Deploy to a free-tier cloud (Railway, Fly.io, or GCP free tier)
- Understand: Why CI/CD? What does it prevent? (The "works on my machine" problem)

**Day 3-4: Security fundamentals**
- Add to TinyScale:
  - Helmet.js for HTTP security headers
  - CORS configuration (understand what CORS actually is — most devs can't explain it)
  - SQL injection prevention (parameterized queries — your ORM handles this, but understand WHY)
  - Input sanitization for URLs (prevent XSS via redirect, open redirect attacks)
  - API key authentication with proper hashing
- Use: `npm audit`, `docker scan` to find vulnerabilities in your dependencies/images
- Read: OWASP Top 10 (https://owasp.org/www-project-top-ten/) — understand each one at a conceptual level

**Day 5-6: Database operations**
- Write a database migration system (or use Drizzle's built-in migrations)
- Understand: Why migrations? Why can't you just ALTER TABLE in production?
- Write a backup script for Postgres (pg_dump)
- Practice: Restore from backup. Add a migration that adds a column. Roll back.
- Connection pooling: Add PgBouncer between your app and Postgres
  - Understand: Why? What happens when 100 Node processes each open 10 connections to Postgres?

**Day 7: Documentation**
- Write a proper README for TinyScale:
  - Architecture diagram (use Mermaid or draw.io)
  - How to run locally
  - How to deploy
  - API documentation
  - Design decisions and trade-offs
- This isn't busywork. This is what hiring managers look at on your GitHub.

**Checkpoint:** Full CI/CD pipeline. Security hardened. Database operations automated. Documented.

---

## Month 3: Go Deeper + Open Source + Get Visible (Weeks 9-12)

### Week 9: Build Something in Go + Understand Concurrency

**Goal:** Build a real tool in Go that plugs into your system.

**Day 1-4: Build a Go-based click analytics aggregator**
- This replaces your Node.js Kafka consumer for aggregation
- Why Go? Because Go's goroutines make concurrent processing natural
- The aggregator:
  - Consumes from Kafka `clicks` topic
  - Batches events (collect 1000 events or wait 5 seconds, whichever comes first)
  - Writes aggregated data to Postgres in bulk
  - Uses goroutines for concurrent batch processing
- Learn: goroutines, channels, sync.WaitGroup, context for cancellation
- Learn: Why is Go's concurrency model different from Node's event loop?

**Day 5-7: Profile and optimize**
- Use Go's built-in profiling (pprof)
- Find bottlenecks: Is it CPU? Memory? I/O?
- Use Go's race detector (`go run -race`)
- Compare performance: Your Go consumer vs your Node.js consumer processing the same Kafka topic
- Write benchmarks (`go test -bench`)

**Checkpoint:** Go service running alongside your Node.js app. You understand concurrency beyond "async/await."

---

### Week 10-11: Open Source Contributions

**Goal:** Read production-quality code. Make real contributions.

**Projects to READ (spend 2-3 days reading each):**

1. **Hono** (https://github.com/honojs/hono)
   - A web framework like Express but ultrafast and works everywhere
   - Why read: Clean TypeScript, routing internals, middleware pattern
   - Start with: `src/router/` — how does URL routing actually work?

2. **Drizzle ORM** (https://github.com/drizzle-team/drizzle-orm)
   - If you're using it, read how it works
   - Start with: How does it convert TypeScript to SQL? Read the query builder.

3. **BullMQ** (https://github.com/taskforcesh/bullmq)
   - You already used it. Now read how it works.
   - Start with: `src/classes/worker.ts` — how does it reliably pick up jobs?

**Projects to CONTRIBUTE to (pick 1-2):**

1. **Cal.com** (https://github.com/calcom/cal.com)
   - Full-stack TypeScript (Next.js + tRPC + Prisma)
   - Very active, good "good first issue" labels
   - Real production app with real users — closest to actual startup engineering
   - Look at: issues labeled "good first issue" or "help wanted"

2. **Infisical** (https://github.com/Infisical/infisical)
   - Secret management platform (like a simpler HashiCorp Vault)
   - TypeScript + Go backend
   - Great for learning security patterns
   - They actively welcome contributors

3. **Appsmith** (https://github.com/appsmithorg/appsmith)
   - Low-code platform, used by enterprises
   - Java + TypeScript + React
   - Huge codebase — good for learning to navigate large projects
   - Very contributor-friendly, good documentation for contributors

4. **Twenty** (https://github.com/twentyhq/twenty)
   - Open source CRM (alternative to Salesforce)
   - TypeScript + NestJS + GraphQL + Postgres
   - Modern architecture, well-structured code
   - Active community, good first issues available

5. **Trigger.dev** (https://github.com/triggerdotdev/trigger.dev)
   - Background job framework (similar to what you built with BullMQ but more advanced)
   - TypeScript throughout
   - You literally built a simpler version of this — you'll understand the codebase faster

**How to actually make your first contribution:**
1. Fork the repo, clone it, get it running locally (this alone teaches you a lot)
2. Read CONTRIBUTING.md
3. Start with documentation fixes or small bug fixes — not features
4. Look for issues labeled: "good first issue", "help wanted", "documentation", "bug"
5. Before coding, comment on the issue: "I'd like to work on this. Here's my approach: ..."
6. Submit a clean PR with a good description

**Even if your PR gets rejected, you learned more from the process than from 100 tutorials.**

---

### Week 12: Polish + Portfolio + Start Applying

**Day 1-3: Polish TinyScale**
- Clean up code, add final tests, improve documentation
- Write a blog post (even on dev.to or Hashnode — free) about ONE interesting thing you learned:
  - "How I reduced API latency by 10x with Redis caching — with actual numbers"
  - "What happens when your Kafka consumer crashes mid-processing"
  - "I built a URL shortener. Here's why it took 3 months."
- Push everything to GitHub with a clean commit history

**Day 4-5: Update your online presence**
- GitHub: Pin TinyScale repo. Make sure the README has the architecture diagram.
- LinkedIn: Update headline. Not "MERN Stack Developer" — instead:
  "Backend Engineer | TypeScript, Go, PostgreSQL, Redis, Kafka, Kubernetes"
- Update resume:
  - Don't list technologies. Describe what you BUILT and the IMPACT.
  - "Built a high-throughput URL shortener handling 5000 req/s with Redis caching, Kafka event streaming, and Elasticsearch analytics on Kubernetes"
  - That sentence will make recruiters pause.

**Day 6-7: Start applying + DSA maintenance**
- Begin applying (don't wait until you feel "ready")
- For DSA: Start Neetcode 150 (https://neetcode.io) — do 2-3 problems per day from now on
  - Focus on: Arrays, Hashmaps, Trees, Graphs, basic DP
  - Target: Be comfortable solving most medium problems in 30-40 minutes
  - This is your 30% maintenance — not your main identity

---

## Daily Schedule Template (Adjust to Your Life)

**If you have a full-time job (which you do):**

| Time | Activity |
|------|----------|
| Before work (1 hr) | DSA practice — 1-2 Neetcode problems |
| Lunch break (30 min) | Read engineering blogs, open source code |
| After work (2-3 hrs) | TinyScale project / open source contribution |
| Weekends (4-5 hrs/day) | Deep project work, longer learning sessions |

**Total: ~25-30 hours/week of focused work outside your job.**

This is hard. It's supposed to be. But it's 3 months, not forever.

---

## What You'll Have After 3 Months

1. **A real project** (TinyScale) that demonstrates: API design, database modeling, caching, message queues, search, containerization, orchestration, CI/CD, monitoring, security, testing, documentation.

2. **Two languages** (TypeScript + Go) with real depth, not tutorial-level knowledge.

3. **Open source contributions** that prove you can work in large codebases with other engineers.

4. **A blog post** that shows you can communicate technical ideas.

5. **Measurable numbers** — "5000 req/s", "10x latency improvement", "3-replica Kubernetes deployment" — things that make resumes stand out.

6. **Actual understanding** of how production systems work, not just "I followed a Docker tutorial once."

---

## Resources (Bookmarked, Not Binged)

**Read when relevant to your current week, not all at once:**

- PostgreSQL: https://www.postgresqltutorial.com
- Docker: "Docker Deep Dive" by Nigel Poulton (or his free YouTube content)
- Kafka: Confluent Developer tutorials (https://developer.confluent.io)
- Kubernetes: Nana's YouTube crash course, then "Kubernetes in Action" book
- Go: https://go.dev/tour/ then https://gobyexample.com
- System Design (light): https://github.com/donnemartin/system-design-primer
- Engineering blogs to follow: Uber Engineering, Netflix Tech Blog, Cloudflare Blog, Stripe Engineering

---

## Rules for These 3 Months

1. **No tutorial hell.** If you're watching a video for more than 30 minutes without typing code, stop.
2. **Break things on purpose.** Kill a container during a load test. Corrupt a Kafka offset. See what happens.
3. **Write things down.** Keep a simple log: what you built, what broke, what you learned. This becomes your blog content and interview stories.
4. **Don't skip the boring parts.** Reading error logs, debugging Docker networking, understanding why your Postgres query is slow — this IS real engineering.
5. **Don't restart the plan.** You WILL feel behind. Week 3 might take you 2 weeks. That's fine. Keep going. A 5-month completion of a 3-month plan is infinitely better than 10 abandoned 1-week plans.
6. **Ship ugly, then improve.** Your first Docker setup will be bad. Your first Kafka consumer will crash. That's the point. You learn from fixing, not from perfection.