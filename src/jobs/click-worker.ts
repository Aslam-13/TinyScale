import { Worker, type Job } from "bullmq";
import { env } from "../config/env.js";
import { CLICK_QUEUE_NAME, type ClickJobData } from "./click-queue.js";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { clicks } from "../db/schema/index.js";
import { Redis } from "ioredis";

// Batch settings
const BATCH_SIZE = 50;
const BATCH_TIMEOUT_MS = 5000; // 5 seconds
const RETRY_DELAY_MS = 10000;  // 10 seconds — wait before retrying after failure

// Worker stats — tracks what ACTUALLY happened at the DB level
const _workerStats = {
  flushedToDb: 0,      // clicks successfully written to Postgres
  flushFailed: 0,      // clicks that failed to write (flush error)
  flushAttempts: 0,     // total flush attempts (success + failure)
  lastFlushAt: null as string | null,
  lastErrorAt: null as string | null,
  lastError: null as string | null,
};

// Expose stats with a LIVE pendingInBuffer count (reads clickBuffer.length in real time)
export const workerStats = new Proxy(_workerStats, {
  get(target, prop, receiver) {
    if (prop === "pendingInBuffer") return clickBuffer.length;
    return Reflect.get(target, prop, receiver);
  },
  ownKeys(target) {
    return [...Reflect.ownKeys(target), "pendingInBuffer"];
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop === "pendingInBuffer") {
      return { configurable: true, enumerable: true, value: clickBuffer.length };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
}) as typeof _workerStats & { pendingInBuffer: number };

// Buffer to collect clicks before flushing to DB
let clickBuffer: ClickJobData[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Worker's own DB and Redis connections (separate from the app's)
let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let redis: Redis | null = null;

function getDb() {
  if (!db) {
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 5, // Worker doesn't need many connections
    });
    db = drizzle(pool);
  }
  return db;
}

function getRedis() {
  if (!redis) {
    redis = new Redis(env.REDIS_URL);
  }
  return redis;
}

/**
 * Flush the click buffer to Postgres in a single batch INSERT.
 */
async function flushClickBuffer(): Promise<void> {
  if (clickBuffer.length === 0) return;

  // Grab current buffer and reset
  const batch = clickBuffer;
  clickBuffer = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const database = getDb();
  _workerStats.flushAttempts++;

  try {
    // BATCH INSERT — one query for N clicks instead of N queries
    await database.insert(clicks).values(
      batch.map((click) => ({
        urlId: click.urlId,
        referrer: click.referrer,
        userAgent: click.userAgent,
        ip: click.ip,
        clickedAt: new Date(click.clickedAt),
      }))
    );

    _workerStats.flushedToDb += batch.length;
    _workerStats.lastFlushAt = new Date().toISOString();
    console.log(`[ClickWorker] Flushed ${batch.length} clicks to database (total: ${_workerStats.flushedToDb})`);

    // Update Redis click leaderboard for each unique shortCode in the batch
    const r = getRedis();
    const shortCodeCounts = new Map<string, number>();
    for (const click of batch) {
      shortCodeCounts.set(
        click.shortCode,
        (shortCodeCounts.get(click.shortCode) ?? 0) + 1
      );
    }
    for (const [code, count] of shortCodeCounts) {
      await r.zincrby("clicks:leaderboard", count, code);
      await r.del(`cache:stats:${code}`);
    }
  } catch (err) {
    _workerStats.flushFailed += batch.length;
    _workerStats.lastErrorAt = new Date().toISOString();
    _workerStats.lastError = err instanceof Error ? err.message : String(err);
    console.error(
      `[ClickWorker] Flush FAILED for ${batch.length} clicks (pending: ${clickBuffer.length + batch.length}):`,
      err
    );
    // Put failed clicks back in the buffer for retry
    clickBuffer.unshift(...batch);
    // Schedule a retry — this is the key fix: without this, failed clicks sit in the buffer forever
    scheduleRetry();
    throw err;
  }
}

/**
 * Schedule a flush after BATCH_TIMEOUT_MS if one isn't already scheduled.
 */
function scheduleFlush(): void {
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushClickBuffer().catch((err) => {
        console.error("[ClickWorker] Scheduled flush failed:", err);
      });
    }, BATCH_TIMEOUT_MS);
  }
}

/**
 * Schedule a retry flush after RETRY_DELAY_MS.
 * Called when a flush fails so the buffer doesn't sit forever.
 */
function scheduleRetry(): void {
  if (!flushTimer) {
    console.log(`[ClickWorker] Scheduling retry in ${RETRY_DELAY_MS / 1000}s...`);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushClickBuffer().catch((err) => {
        console.error("[ClickWorker] Retry flush failed:", err);
      });
    }, RETRY_DELAY_MS);
  }
}

/**
 * Create and start the click worker.
 */
export function createClickWorker(): Worker<ClickJobData> {
  const worker = new Worker<ClickJobData>(
    CLICK_QUEUE_NAME,
    async (job: Job<ClickJobData>) => {
      // Add click to buffer
      clickBuffer.push(job.data);

      // Flush if buffer is full
      if (clickBuffer.length >= BATCH_SIZE) {
        await flushClickBuffer();
      } else {
        // Schedule a flush in case traffic is slow
        scheduleFlush();
      }
    },
    {
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || "6379"),
        maxRetriesPerRequest: null,
      },
      concurrency: 10,
      // Process up to 10 jobs concurrently — each just adds to buffer (fast)

      limiter: {
        max: 1000,
        duration: 1000,
        // At most 1000 jobs/sec to avoid overwhelming Postgres
      },
    }
  );

  worker.on("completed", () => {
    // Individual job completed — batch flushes are logged in flushClickBuffer()
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[ClickWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("[ClickWorker] Worker error:", err);
  });

  worker.on("stalled", (jobId) => {
    console.warn(
      `[ClickWorker] Job ${jobId} stalled (took too long, will be retried)`
    );
  });

  console.log("[ClickWorker] Worker started, waiting for jobs...");

  return worker;
}

/**
 * Gracefully shut down the worker.
 * Flushes any remaining clicks in the buffer before stopping.
 */
export async function shutdownClickWorker(worker: Worker): Promise<void> {
  console.log("[ClickWorker] Shutting down...");

  // Flush remaining clicks
  await flushClickBuffer();

  // Close the worker (stops pulling new jobs)
  await worker.close();

  // Close DB pool
  if (pool) {
    await pool.end();
  }

  // Close Redis
  if (redis) {
    await redis.quit();
  }

  console.log("[ClickWorker] Shutdown complete");
}
