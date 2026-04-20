import fp from "fastify-plugin";
import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import client from "prom-client";

// Create a Registry — this holds all metrics
const register = new client.Registry();

// Add default Node.js metrics (memory, CPU, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// === CUSTOM METRICS FOR TINYSCALE ===

// 1. HTTP request counter — how many requests, broken down by method, route, status
const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
});

// 2. HTTP request duration — how long requests take (histogram)
const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    // Buckets define the boundaries for grouping response times
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

// 3. Redis cache hit/miss counter
export const cacheHitsTotal = new client.Counter({
    name: "cache_hits_total",
    help: "Total number of Redis cache hits",
    registers: [register],
});

export const cacheMissesTotal = new client.Counter({
    name: "cache_misses_total",
    help: "Total number of Redis cache misses",
    registers: [register],
});

// 4. Click queue depth gauge — how many jobs are waiting
export const queueDepthGauge = new client.Gauge({
    name: "click_queue_depth",
    help: "Number of jobs waiting in the click queue",
    labelNames: ["state"],
    registers: [register],
});

// 5. Redirect counter — specifically track redirects (the hot path)
export const redirectsTotal = new client.Counter({
    name: "redirects_total",
    help: "Total number of URL redirects served",
    registers: [register],
});

export const metricsPlugin = fp(async (fastify: FastifyInstance) => {
    // Hook into every request to track duration and count
    fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
        // Skip the /metrics endpoint itself (avoid infinite recursion in metrics)
        if (request.url === "/metrics") return;

        const route = request.routeOptions?.url ?? request.url;
        const method = request.method;
        const statusCode = reply.statusCode.toString();

        // Increment request counter
        httpRequestsTotal.inc({ method, route, status_code: statusCode });

        // Record request duration
        const duration = reply.elapsedTime / 1000; // Fastify gives ms, Prometheus wants seconds
        httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            duration
        );
    });

    // Expose GET /metrics endpoint for Prometheus to scrape
    fastify.get("/metrics", async (request, reply) => {
        reply.header("Content-Type", register.contentType);
        return register.metrics();
    });

    fastify.log.info("Metrics plugin registered - GET /metrics available");
});
