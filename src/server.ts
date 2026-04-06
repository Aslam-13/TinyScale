import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { createClickWorker, shutdownClickWorker } from "./jobs/click-worker.js";
import { monitorDeadLetters } from "./jobs/dead-letter.js";

async function main() {
  const app = await buildApp();

  // Start the click worker (processes click jobs from the queue)
  const clickWorker = createClickWorker();
  const deadLetterMonitor = monitorDeadLetters();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);

    // Shut down worker first (flush remaining clicks)
    await shutdownClickWorker(clickWorker);

    // Close dead letter monitor
    await deadLetterMonitor.close();

    // Then close the app (closes DB pool, Redis, etc.)
    await app.close();

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    await shutdownClickWorker(clickWorker);
    process.exit(1);
  }
}

main();
