import fp from "fastify-plugin";
import { type FastifyInstance } from "fastify";
import { db, type Database } from "../db/index.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

export const dbPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    fastify.log.info("Closing database connection pool");
  });
});
