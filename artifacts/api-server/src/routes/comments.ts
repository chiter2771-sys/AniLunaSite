import { Router } from "express";
import { db, commentsTable, commentLikesTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";
import { CreateCommentBody } from "@workspace/api-zod";

const XP_PER_COMMENT = 10;
const LEVEL_XP_THRESHOLD = 1000;

const router = Router();

router.get("/comments/:animeId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.animeId) ? req.params.animeId[0] : req.params.animeId;
  const animeId = decodeURIComponent(rawId);

  let userId: string | null = null;
  try {
    userId = await getOrCreateUser(req);
  } catch {
    // ok
  }

  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.animeId, animeId))
    .orderBy(desc(commentsTable.createdAt))
    .limit(50);

  let likedIds = new Set<number>();
  if (userId) {
    const likes = await db
      .select()
      .from(commentLikesTable)
      .where(eq(commentLikesTable.userId, userId));
    likedIds = new Set(likes.map((l) => l.commentId));
  }

  res.json({
    comments: comments.map((c) => ({
      id: c.id,
      animeId: c.animeId,
      userId: c.userId,
      username: c.username,
      userAvatar: c.userAvatar,
      text: c.text,
      likes: c.likes,
      liked: likedIds.has(c.id),
      createdAt: c.createdAt.toISOString(),
    })),
    total: comments.length,
  });
});

router.post("/comments", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { animeId, text } = parsed.data;

  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: "Comment text cannot be empty" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const [comment] = await db
    .insert(commentsTable)
    .values({
      animeId,
      userId,
      username: user?.username ?? "Anonymous",
      userAvatar: user?.avatar ?? null,
      text: text.trim(),
    })
    .returning();

  if (user) {
    const newXp = user.xp + XP_PER_COMMENT;
    const newLevel = Math.floor(newXp / LEVEL_XP_THRESHOLD) + 1;
    await db.update(usersTable).set({ xp: newXp, level: newLevel }).where(eq(usersTable.id, userId));
  }

  res.status(201).json({
    id: comment.id,
    animeId: comment.animeId,
    userId: comment.userId,
    username: comment.username,
    userAvatar: comment.userAvatar,
    text: comment.text,
    likes: comment.likes,
    liked: false,
    createdAt: comment.createdAt.toISOString(),
  });
});

router.post("/comments/:id/like", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  const existingLike = await db
    .select()
    .from(commentLikesTable)
    .where(and(eq(commentLikesTable.commentId, id), eq(commentLikesTable.userId, userId)))
    .limit(1);

  let liked: boolean;

  if (existingLike.length > 0) {
    await db
      .delete(commentLikesTable)
      .where(and(eq(commentLikesTable.commentId, id), eq(commentLikesTable.userId, userId)));

    await db
      .update(commentsTable)
      .set({ likes: Math.max(0, (await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1))[0]?.likes - 1) })
      .where(eq(commentsTable.id, id));

    liked = false;
  } else {
    await db.insert(commentLikesTable).values({ commentId: id, userId });

    const [c] = await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1);
    await db.update(commentsTable).set({ likes: (c?.likes ?? 0) + 1 }).where(eq(commentsTable.id, id));

    liked = true;
  }

  const [updated] = await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1);

  res.json({ liked, likes: updated?.likes ?? 0 });
});

router.delete("/comments/:id", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  await db
    .delete(commentsTable)
    .where(and(eq(commentsTable.id, id), eq(commentsTable.userId, userId)));

  res.sendStatus(204);
});

export default router;
