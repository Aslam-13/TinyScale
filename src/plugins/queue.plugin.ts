import fp from "fastify-plugin";
import { type FastifyInstance } from "fastify";
import { type Queue } from "bullmq";
import { createClickQueue, type ClickJobData } from "../jobs/click-queue.js";

// Extend Fastify's type system
declare module "fastify" {
  interface FastifyInstance {
    clickQueue: Queue<ClickJobData>;
  }
}

export const queuePlugin = fp(async (fastify: FastifyInstance) => {
  const clickQueue = createClickQueue();

  fastify.decorate("clickQueue", clickQueue);

  // Log queue events
  clickQueue.on("error", (err) => {
    fastify.log.error(err, "Click queue error");
  });

  // Clean up on shutdown
  fastify.addHook("onClose", async () => {
    fastify.log.info("Closing click queue");
    await clickQueue.close();
  });

  fastify.log.info("Click queue initialized");
});
