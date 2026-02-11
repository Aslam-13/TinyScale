import { eq } from "drizzle-orm";
import { type FastifyInstance } from "fastify";
import { users } from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { generateApiKey } from "../../utils/api-key.js";
import { ConflictError, UnauthorizedError } from "../../errors/http-errors.js";
import type { RegisterBody, LoginBody } from "./auth.schema.js";

export async function registerUser(
  app: FastifyInstance,
  body: RegisterBody
) {
  const existing = await app.db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await hashPassword(body.password);
  const apiKey = generateApiKey();

  const [user] = await app.db
    .insert(users)
    .values({
      email: body.email,
      passwordHash,
      apiKey,
    })
    .returning({ id: users.id, email: users.email });

  const token = app.jwt.sign({ userId: user!.id });

  return { user: user!, token, apiKey };
}

export async function loginUser(
  app: FastifyInstance,
  body: LoginBody
) {
  const [user] = await app.db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = app.jwt.sign({ userId: user.id });

  return { user: { id: user.id, email: user.email }, token };
}
