import { Queue } from "bullmq";
import { env } from "../config/env.js";

// Define the shape of a click job's data
export interface ClickJobData {
  urlId: string;
  shortCode: string;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
  clickedAt: string; // ISO timestamp — serialize dates as strings for JSON
}

// Queue name — must be the same in producer and consumer
export const CLICK_QUEUE_NAME = "clicks";

// Create the queue (producer side)
export function createClickQueue(): Queue<ClickJobData> {
  return new Queue<ClickJobData>(CLICK_QUEUE_NAME, {
    connection: {
      host: new URL(env.REDIS_URL).hostname,
      port: parseInt(new URL(env.REDIS_URL).port || "6379"),
      maxRetriesPerRequest: null,
      // BullMQ REQUIRES maxRetriesPerRequest to be null
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
        // Retry delays: 1s, 2s, 4s
      },
      removeOnComplete: {
        count: 1000,
        // Keep last 1000 completed jobs for debugging
      },
      removeOnFail: {
        count: 5000,
        // Keep last 5000 failed jobs for investigation
      },
    },
  });
}
