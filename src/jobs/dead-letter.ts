import { QueueEvents } from "bullmq";
import { env } from "../config/env.js";
import { CLICK_QUEUE_NAME } from "./click-queue.js";

/**
 * Monitors the click queue for failed jobs that have exhausted all retries.
 * In production, this would alert your monitoring system (PagerDuty, Slack, etc.)
 */
export function monitorDeadLetters(): QueueEvents {
  const queueEvents = new QueueEvents(CLICK_QUEUE_NAME, {
    connection: {
      host: new URL(env.REDIS_URL).hostname,
      port: parseInt(new URL(env.REDIS_URL).port || "6379"),
      maxRetriesPerRequest: null,
    },
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(
      `[DeadLetter] Job ${jobId} permanently failed: ${failedReason}`
    );
  });

  queueEvents.on("stalled", ({ jobId }) => {
    console.warn(`[DeadLetter] Job ${jobId} stalled`);
  });

  console.log("[DeadLetter] Monitoring for failed jobs...");

  return queueEvents;
}
