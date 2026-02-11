import { type FastifyInstance, type FastifyError } from "fastify";
import { AppError } from "./app-error.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | Error, _request, reply) => {
    // Fastify validation errors
    if ("validation" in error && (error as FastifyError).validation) {
      return reply.status(400).send({
        error: "Validation Error",
        message: error.message,
        statusCode: 400,
      });
    }

    // Our custom AppError hierarchy
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.constructor.name,
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    // Fastify errors with statusCode (e.g. 404 from route not found)
    const statusCode = "statusCode" in error ? (error as FastifyError).statusCode : undefined;
    if (statusCode && statusCode < 500) {
      return reply.status(statusCode).send({
        error: error.name,
        message: error.message,
        statusCode,
      });
    }

    // Unknown / unexpected errors — never leak internals
    app.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Something went wrong",
      statusCode: 500,
    });
  });
}
