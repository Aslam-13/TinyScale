import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  apiKey: varchar("api_key", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── URLs ───────────────────────────────────────────────
export const urls = pgTable(
  "urls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
    originalUrl: varchar("original_url", { length: 2048 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_urls_short_code").on(table.shortCode),
    index("idx_urls_user_id").on(table.userId),
  ]
);

// ── Clicks ─────────────────────────────────────────────
export const clicks = pgTable(
  "clicks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    urlId: uuid("url_id")
      .notNull()
      .references(() => urls.id, { onDelete: "cascade" }),
    referrer: varchar("referrer", { length: 2048 }),
    userAgent: varchar("user_agent", { length: 512 }),
    ip: varchar("ip", { length: 45 }),
    country: varchar("country", { length: 2 }),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_clicks_url_id").on(table.urlId),
    index("idx_clicks_clicked_at").on(table.clickedAt),
  ]
);
