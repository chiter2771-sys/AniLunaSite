import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";
import { UpdateProfileBody } from "@workspace/api-zod";

const router = Router();

router.get("/profile", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.cookie("anon_id", userId, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  });

  res.json({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    banner: user.banner,
    bio: user.bio,
    level: user.level,
    xp: user.xp,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/profile", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<{ username: string; avatar: string; banner: string; bio: string }> = {};
  if (parsed.data.username) {
    const normalizedUsername = parsed.data.username.trim();
    if (!normalizedUsername) {
      res.status(400).json({ error: "Username cannot be empty" });
      return;
    }
    updates.username = normalizedUsername;
  }
  if (parsed.data.avatar !== undefined) updates.avatar = parsed.data.avatar;
  if (parsed.data.banner !== undefined) updates.banner = parsed.data.banner;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio.trim();

  if (Object.keys(updates).length === 0) {
    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!currentUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      banner: currentUser.banner,
      bio: currentUser.bio,
      level: currentUser.level,
      xp: currentUser.xp,
      createdAt: currentUser.createdAt.toISOString(),
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  res.cookie("anon_id", userId, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  });

  res.json({
    id: updated.id,
    username: updated.username,
    avatar: updated.avatar,
    banner: updated.banner,
    bio: updated.bio,
    level: updated.level,
    xp: updated.xp,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
