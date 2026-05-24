import { Router } from "express";
import { db, collectionsTable, collectionItemsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";
import { CreateCollectionBody, UpdateCollectionBody, AddToCollectionBody } from "@workspace/api-zod";

const router = Router();

router.get("/collections", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const cols = await db
    .select()
    .from(collectionsTable)
    .where(eq(collectionsTable.userId, userId))
    .orderBy(desc(collectionsTable.createdAt));

  const result = await Promise.all(
    cols.map(async (col) => {
      const items = await db
        .select()
        .from(collectionItemsTable)
        .where(eq(collectionItemsTable.collectionId, col.id));

      const coverPoster = items[0]?.animePoster ?? null;

      return {
        id: col.id,
        title: col.title,
        description: col.description,
        isPublic: col.isPublic,
        itemCount: items.length,
        coverPoster,
        createdAt: col.createdAt.toISOString(),
      };
    })
  );

  res.json(result);
});

router.post("/collections", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const parsed = CreateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [col] = await db
    .insert(collectionsTable)
    .values({
      userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      isPublic: parsed.data.isPublic ?? false,
    })
    .returning();

  res.status(201).json({
    id: col.id,
    title: col.title,
    description: col.description,
    isPublic: col.isPublic,
    itemCount: 0,
    coverPoster: null,
    createdAt: col.createdAt.toISOString(),
  });
});

router.get("/collections/:id", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  const [col] = await db
    .select()
    .from(collectionsTable)
    .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)))
    .limit(1);

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const items = await db
    .select()
    .from(collectionItemsTable)
    .where(eq(collectionItemsTable.collectionId, id))
    .orderBy(desc(collectionItemsTable.addedAt));

  res.json({
    id: col.id,
    title: col.title,
    description: col.description,
    isPublic: col.isPublic,
    itemCount: items.length,
    coverPoster: items[0]?.animePoster ?? null,
    createdAt: col.createdAt.toISOString(),
    items: items.map((item) => ({
      id: item.id,
      animeId: item.animeId,
      animeTitle: item.animeTitle,
      animePoster: item.animePoster,
      animeType: item.animeType,
      addedAt: item.addedAt.toISOString(),
    })),
  });
});

router.patch("/collections/:id", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  const parsed = UpdateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<{ title: string; description: string | null; isPublic: boolean }> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.isPublic !== undefined) updates.isPublic = parsed.data.isPublic;

  const [updated] = await db
    .update(collectionsTable)
    .set(updates)
    .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const itemCount = (
    await db.select().from(collectionItemsTable).where(eq(collectionItemsTable.collectionId, id))
  ).length;

  res.json({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    isPublic: updated.isPublic,
    itemCount,
    coverPoster: null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/collections/:id", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  await db
    .delete(collectionItemsTable)
    .where(eq(collectionItemsTable.collectionId, id));

  await db
    .delete(collectionsTable)
    .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)));

  res.sendStatus(204);
});

router.post("/collections/:id/items", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);

  const [col] = await db
    .select()
    .from(collectionsTable)
    .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)))
    .limit(1);

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const parsed = AddToCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { animeId, animeTitle, animePoster, animeType } = parsed.data;

  const [item] = await db
    .insert(collectionItemsTable)
    .values({
      collectionId: id,
      animeId,
      animeTitle,
      animePoster: animePoster ?? null,
      animeType: animeType ?? "anime",
    })
    .returning();

  res.status(201).json({
    id: item.id,
    animeId: item.animeId,
    animeTitle: item.animeTitle,
    animePoster: item.animePoster,
    animeType: item.animeType,
    addedAt: item.addedAt.toISOString(),
  });
});

router.delete("/collections/:id/items/:animeId", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId);
  const rawAnimeId = Array.isArray(req.params.animeId) ? req.params.animeId[0] : req.params.animeId;
  const animeId = decodeURIComponent(rawAnimeId);

  const [col] = await db
    .select()
    .from(collectionsTable)
    .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)))
    .limit(1);

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  await db
    .delete(collectionItemsTable)
    .where(and(eq(collectionItemsTable.collectionId, id), eq(collectionItemsTable.animeId, animeId)));

  res.sendStatus(204);
});

export default router;
