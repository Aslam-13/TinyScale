import { type FastifyInstance } from "fastify";
import { RegisterBody, LoginBody, AuthResponse } from "./auth.schema.js";
import { registerHandler, loginHandler } from "./auth.handler.js";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/api/auth/register",
    {
      schema: {
        body: RegisterBody,
        response: { 201: AuthResponse },
      },
    },
    registerHandler
  );

  app.post(
    "/api/auth/login",
    {
      schema: {
        body: LoginBody,
        response: { 200: AuthResponse },
      },
    },
    loginHandler
  );
}
