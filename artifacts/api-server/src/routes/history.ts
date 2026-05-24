import { Router } from "express";
import { db, watchHistoryTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";
import { SaveProgressBody } from "@workspace/api-zod";

const XP_PER_EPISODE = 25;
const LEVEL_XP_THRESHOLD = 1000;

const router = Router();

router.get("/history", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const { limit = "20", offset = "0" } = req.query as Record<string, string>;

  const items = await db
    .select()
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, userId))
    .orderBy(desc(watchHistoryTable.updatedAt))
    .limit(Math.min(parseInt(limit), 100))
    .offset(parseInt(offset));

  const allItems = await db
    .select()
    .from(watchHistoryTable)
    .where(eq(watchHistoryTable.userId, userId));
  const total = allItems.length;

  res.json({
    items: items.map((item) => ({
      id: item.id,
      animeId: item.animeId,
      animeTitle: item.animeTitle,
      animePoster: item.animePoster,
      episode: item.episode,
      position: item.position,
      duration: item.duration,
      progress: item.progress,
      updatedAt: item.updatedAt.toISOString(),
    })),
    total: Number(total),
  });
});

router.post("/history", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const parsed = SaveProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { animeId, animeTitle, animePoster, episode, position, duration } = parsed.data;
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const existing = await db
    .select()
    .from(watchHistoryTable)
    .where(and(eq(watchHistoryTable.userId, userId), eq(watchHistoryTable.animeId, animeId)))
    .limit(1);

  let saved;

  if (existing.length > 0) {
    [saved] = await db
      .update(watchHistoryTable)
      .set({ episode, position, duration, progress, animeTitle, animePoster: animePoster ?? null })
      .where(and(eq(watchHistoryTable.userId, userId), eq(watchHistoryTable.animeId, animeId)))
      .returning();
  } else {
    [saved] = await db
      .insert(watchHistoryTable)
      .values({ userId, animeId, animeTitle, animePoster: animePoster ?? null, episode, position, duration, progress })
      .returning();

    if (progress >= 90) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (user) {
        const newXp = user.xp + XP_PER_EPISODE;
        const newLevel = Math.floor(newXp / LEVEL_XP_THRESHOLD) + 1;
        await db.update(usersTable).set({ xp: newXp, level: newLevel }).where(eq(usersTable.id, userId));
      }
    }
  }

  res.json({
    id: saved.id,
    animeId: saved.animeId,
    animeTitle: saved.animeTitle,
    animePoster: saved.animePoster,
    episode: saved.episode,
    position: saved.position,
    duration: saved.duration,
    progress: saved.progress,
    updatedAt: saved.updatedAt.toISOString(),
  });
});

router.delete("/history/:animeId", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const raw = Array.isArray(req.params.animeId) ? req.params.animeId[0] : req.params.animeId;
  const animeId = decodeURIComponent(raw);

  await db
    .delete(watchHistoryTable)
    .where(and(eq(watchHistoryTable.userId, userId), eq(watchHistoryTable.animeId, animeId)));

  res.sendStatus(204);
});

export default router;
