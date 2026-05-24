import { Router } from "express";
import { db, ratingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";
import { RateAnimeBody } from "@workspace/api-zod";

const router = Router();

router.get("/ratings/:animeId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.animeId) ? req.params.animeId[0] : req.params.animeId;
  const animeId = decodeURIComponent(rawId);

  let userId: string | null = null;
  try {
    userId = await getOrCreateUser(req);
  } catch {
    // ok
  }

  const allRatings = await db
    .select()
    .from(ratingsTable)
    .where(eq(ratingsTable.animeId, animeId));

  const count = allRatings.length;
  const average = count > 0 ? allRatings.reduce((sum, r) => sum + r.score, 0) / count : 0;

  const distribution: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) distribution[String(i)] = 0;
  for (const r of allRatings) {
    const key = String(Math.min(10, Math.max(1, r.score)));
    distribution[key] = (distribution[key] ?? 0) + 1;
  }

  let userRating: number | null = null;
  if (userId) {
    const [userEntry] = await db
      .select()
      .from(ratingsTable)
      .where(and(eq(ratingsTable.animeId, animeId), eq(ratingsTable.userId, userId)))
      .limit(1);
    if (userEntry) userRating = userEntry.score;
  }

  res.json({ animeId, average, count, userRating, distribution });
});

router.post("/ratings", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const parsed = RateAnimeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { animeId, score, animeTitle } = parsed.data;
  const clampedScore = Math.min(10, Math.max(1, score));

  const existing = await db
    .select()
    .from(ratingsTable)
    .where(and(eq(ratingsTable.animeId, animeId), eq(ratingsTable.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ratingsTable)
      .set({ score: clampedScore })
      .where(and(eq(ratingsTable.animeId, animeId), eq(ratingsTable.userId, userId)));
  } else {
    await db.insert(ratingsTable).values({
      animeId,
      animeTitle,
      userId,
      score: clampedScore,
    });
  }

  const allRatings = await db.select().from(ratingsTable).where(eq(ratingsTable.animeId, animeId));
  const count = allRatings.length;
  const average = count > 0 ? allRatings.reduce((sum, r) => sum + r.score, 0) / count : 0;

  const distribution: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) distribution[String(i)] = 0;
  for (const r of allRatings) {
    const key = String(Math.min(10, Math.max(1, r.score)));
    distribution[key] = (distribution[key] ?? 0) + 1;
  }

  res.json({ animeId, average, count, userRating: clampedScore, distribution });
});

export default router;
