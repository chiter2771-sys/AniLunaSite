import { pgTable, text, integer, real, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const libraryTable = pgTable("library", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  animeId: text("anime_id").notNull(),
  animeTitle: text("anime_title").notNull(),
  animePoster: text("anime_poster"),
  animeType: text("anime_type").notNull().default("anime"),
  status: text("status").notNull().default("plan_to_watch"),
  episodesWatched: integer("episodes_watched").notNull().default(0),
  totalEpisodes: integer("total_episodes"),
  userRating: real("user_rating"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLibrarySchema = createInsertSchema(libraryTable).omit({ id: true, addedAt: true, updatedAt: true });
export type InsertLibrary = z.infer<typeof insertLibrarySchema>;
export type Library = typeof libraryTable.$inferSelect;
