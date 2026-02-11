import { eq } from "drizzle-orm";
import { type FastifyInstance } from "fastify";
import { urls, clicks } from "../../db/schema/index.js";
import { generateShortCode } from "../../utils/short-code.js";
import { NotFoundError, ConflictError } from "../../errors/http-errors.js";

const MAX_COLLISION_RETRIES = 5;

export async function createShortUrl(
  app: FastifyInstance,
  userId: string,
  originalUrl: string,
  expiresAt?: string
) {
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const shortCode = generateShortCode();
    try {
      const [url] = await app.db
        .insert(urls)
        .values({
          shortCode,
          originalUrl,
          userId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      return url!;
    } catch (err: unknown) {
      // Unique constraint violation on short_code — retry with new code
      const isUniqueViolation =
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "23505";
      if (isUniqueViolation && attempt < MAX_COLLISION_RETRIES - 1) {
        continue;
      }
      throw err;
    }
  }

  throw new ConflictError("Failed to generate unique short code");
}

export async function resolveShortCode(app: FastifyInstance, code: string) {
  const [url] = await app.db
    .select()
    .from(urls)
    .where(eq(urls.shortCode, code))
    .limit(1);

  if (!url) {
    throw new NotFoundError("Short URL not found");
  }

  // Check expiration
  if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
    throw new NotFoundError("Short URL has expired");
  }

  return url;
}

export async function recordClick(
  app: FastifyInstance,
  urlId: string,
  meta: { referrer?: string; userAgent?: string; ip?: string }
) {
  await app.db.insert(clicks).values({
    urlId,
    referrer: meta.referrer ?? null,
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
  });
}
