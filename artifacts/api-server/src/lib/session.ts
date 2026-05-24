import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { v4 as uuidv4 } from "uuid";

const ANON_ID_COOKIE = "anon_id";

function generateUsername(): string {
  const adjectives = ["Swift", "Bold", "Cosmic", "Silent", "Dark", "Vivid", "Neon", "Lunar"];
  const nouns = ["Viewer", "Otaku", "Watcher", "Fan", "Scout", "Voyager", "Wanderer", "Ronin"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}${noun}${num}`;
}

export async function getOrCreateUser(req: Request): Promise<string> {
  let userId = req.cookies?.[ANON_ID_COOKIE] as string | undefined;

  if (!userId) {
    userId = uuidv4();
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(usersTable).values({
      id: userId,
      username: generateUsername(),
    });
  }

  return userId;
}
