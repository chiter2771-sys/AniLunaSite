import { Router } from "express";
import { db, libraryTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";
import { AddToLibraryBody, UpdateLibraryEntryBody } from "@workspace/api-zod";

const router = Router();

router.get("/library", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const { status, limit = "20", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(libraryTable.userId, userId)];
  if (status) {
    conditions.push(eq(libraryTable.status, status));
  }

  const items = await db
    .select()
    .from(libraryTable)
    .where(and(...conditions))
    .orderBy(desc(libraryTable.updatedAt))
    .limit(Math.min(parseInt(limit), 100))
    .offset(parseInt(offset));

  const all = await db.select().from(libraryTable).where(eq(libraryTable.userId, userId));
  const total = all.length;

  const counts = {
    watching: all.filter((i) => i.status === "watching").length,
    completed: all.filter((i) => i.status === "completed").length,
    plan_to_watch: all.filter((i) => i.status === "plan_to_watch").length,
    dropped: all.filter((i) => i.status === "dropped").length,
    on_hold: all.filter((i) => i.status === "on_hold").length,
  };

  res.json({
    items: items.map((item) => ({
      id: item.id,
      animeId: item.animeId,
      animeTitle: item.animeTitle,
      animePoster: item.animePoster,
      animeType: item.animeType,
      status: item.status,
      episodesWatched: item.episodesWatched,
      totalEpisodes: item.totalEpisodes,
      userRating: item.userRating,
      addedAt: item.addedAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    total,
    counts,
  });
});

router.post("/library", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const parsed = AddToLibraryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { animeId, animeTitle, animePoster, animeType, status, episodesWatched, totalEpisodes } = parsed.data;

  const existing = await db
    .select()
    .from(libraryTable)
    .where(and(eq(libraryTable.userId, userId), eq(libraryTable.animeId, animeId)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(libraryTable)
      .set({ status: status ?? "plan_to_watch", animeTitle, animePoster: animePoster ?? null, updatedAt: new Date() })
      .where(and(eq(libraryTable.userId, userId), eq(libraryTable.animeId, animeId)))
      .returning();

    res.status(201).json(formatLibraryEntry(updated));
    return;
  }

  const [entry] = await db
    .insert(libraryTable)
    .values({
      userId,
      animeId,
      animeTitle,
      animePoster: animePoster ?? null,
      animeType: animeType ?? "anime",
      status: status ?? "plan_to_watch",
      episodesWatched: episodesWatched ?? 0,
      totalEpisodes: totalEpisodes ?? null,
    })
    .returning();

  res.status(201).json(formatLibraryEntry(entry));
});

router.put("/library/:id", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  const parsed = UpdateLibraryEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<{ status: string; episodesWatched: number; userRating: number | null }> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.episodesWatched !== undefined) updates.episodesWatched = parsed.data.episodesWatched;
  if (parsed.data.userRating !== undefined) updates.userRating = parsed.data.userRating;

  const [updated] = await db
    .update(libraryTable)
    .set(updates)
    .where(and(eq(libraryTable.id, id), eq(libraryTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Library entry not found" });
    return;
  }

  res.json(formatLibraryEntry(updated));
});

router.delete("/library/:id", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  await db.delete(libraryTable).where(and(eq(libraryTable.id, id), eq(libraryTable.userId, userId)));

  res.sendStatus(204);
});

function formatLibraryEntry(item: typeof libraryTable.$inferSelect) {
  return {
    id: item.id,
    animeId: item.animeId,
    animeTitle: item.animeTitle,
    animePoster: item.animePoster,
    animeType: item.animeType,
    status: item.status,
    episodesWatched: item.episodesWatched,
    totalEpisodes: item.totalEpisodes,
    userRating: item.userRating,
    addedAt: item.addedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export default router;
