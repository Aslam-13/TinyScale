import { relations } from "drizzle-orm";
import { users, urls, clicks } from "./tables.js";

export { users, urls, clicks } from "./tables.js";

export const usersRelations = relations(users, ({ many }) => ({
  urls: many(urls),
}));

export const urlsRelations = relations(urls, ({ one, many }) => ({
  user: one(users, {
    fields: [urls.userId],
    references: [users.id],
  }),
  clicks: many(clicks),
}));

export const clicksRelations = relations(clicks, ({ one }) => ({
  url: one(urls, {
    fields: [clicks.urlId],
    references: [urls.id],
  }),
}));
