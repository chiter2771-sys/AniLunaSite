import { pgTable, text, integer, real, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const watchHistoryTable = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  animeId: text("anime_id").notNull(),
  animeTitle: text("anime_title").notNull(),
  animePoster: text("anime_poster"),
  episode: integer("episode").notNull().default(1),
  position: real("position").notNull().default(0),
  duration: real("duration").notNull().default(0),
  progress: real("progress").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWatchHistorySchema = createInsertSchema(watchHistoryTable).omit({ id: true, updatedAt: true });
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
export type WatchHistory = typeof watchHistoryTable.$inferSelect;
