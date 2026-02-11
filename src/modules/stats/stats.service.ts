import { eq, sql, count } from "drizzle-orm";
import { type FastifyInstance } from "fastify";
import { urls, clicks } from "../../db/schema/index.js";
import { NotFoundError } from "../../errors/http-errors.js";

export async function getUrlStats(app: FastifyInstance, code: string) {
  // Get the URL
  const [url] = await app.db
    .select()
    .from(urls)
    .where(eq(urls.shortCode, code))
    .limit(1);

  if (!url) {
    throw new NotFoundError("Short URL not found");
  }

  // Total clicks
  const [totalResult] = await app.db
    .select({ count: count() })
    .from(clicks)
    .where(eq(clicks.urlId, url.id));

  const totalClicks = totalResult?.count ?? 0;

  // Clicks by date
  const clicksByDate = await app.db
    .select({
      date: sql<string>`DATE(${clicks.clickedAt})::text`,
      count: count(),
    })
    .from(clicks)
    .where(eq(clicks.urlId, url.id))
    .groupBy(sql`DATE(${clicks.clickedAt})`)
    .orderBy(sql`DATE(${clicks.clickedAt})`);

  // Top referrers
  const referrers = await app.db
    .select({
      referrer: sql<string>`COALESCE(${clicks.referrer}, 'Direct')`,
      count: count(),
    })
    .from(clicks)
    .where(eq(clicks.urlId, url.id))
    .groupBy(clicks.referrer)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  // Top countries
  const countries = await app.db
    .select({
      country: sql<string>`COALESCE(${clicks.country}, 'Unknown')`,
      count: count(),
    })
    .from(clicks)
    .where(eq(clicks.urlId, url.id))
    .groupBy(clicks.country)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  return {
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    totalClicks,
    clicksByDate,
    referrers,
    countries,
  };
}
