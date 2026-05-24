import { Router } from "express";
import {
  kodikList,
  kodikSearch,
  kodikGetById,
  kodikGetByShikimoriId,
  kodikGetAllTranslations,
  mapKodikResultToAnime,
  decodeKodikId,
  extractShikimoriRef,
  deduplicateByShikimoriId,
  getKodikHLS,
} from "../lib/kodik";
import {
  jikanGetTopAnime,
  jikanGetSeasonal,
  mapJikanAnime,
} from "../lib/jikan";
import { getOrCreateUser } from "../lib/session";
import { db, libraryTable, ratingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Resolve an anime from either a Kodik-encoded ID or a Shikimori-encoded ref (from Jikan results)
async function resolveAnimeById(rawParam: string): Promise<{ result: Awaited<ReturnType<typeof kodikGetById>>; resolvedId: string }> {
  const raw = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const decoded = decodeKodikId(raw);
  const shikimoriId = extractShikimoriRef(decoded);
  if (shikimoriId) {
    const result = await kodikGetByShikimoriId(shikimoriId);
    return { result, resolvedId: result?.id ?? raw };
  }
  const result = await kodikGetById(decoded);
  return { result, resolvedId: decoded };
}

function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let season: string;
  if (month >= 1 && month <= 3) season = "winter";
  else if (month >= 4 && month <= 6) season = "spring";
  else if (month >= 7 && month <= 9) season = "summer";
  else season = "fall";
  return { season, year };
}

router.get("/anime", async (req, res): Promise<void> => {
  try {
    const { page = "1", limit = "20", genres, year, type, status, season, sort, order } = req.query as Record<string, string>;
    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page || "1") || 1, 1);

    const data = await kodikList({ limit: Math.min(limitNum * pageNum * 2, 200), genres, year, type, status, season, sort, order });
    const dedupedAll = deduplicateByShikimoriId(data.results);
    const start = (pageNum - 1) * limitNum;
    const deduped = dedupedAll.slice(start, start + limitNum);

    res.json({
      results: deduped.map(mapKodikResultToAnime),
      total: data.total,
      page: 1,
      limit: limitNum,
    });
  } catch (err) {
    logger.error({ err }, "Error listing anime");
    res.status(500).json({ error: "Failed to fetch anime" });
  }
});

router.get("/anime/search", async (req, res): Promise<void> => {
  try {
    const { q, limit = "20" } = req.query as Record<string, string>;
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const limitNum = Math.min(parseInt(limit), 100);
    const data = await kodikSearch(q, limitNum * 2);
    const deduped = deduplicateByShikimoriId(data.results).slice(0, limitNum);
    res.json({
      results: deduped.map(mapKodikResultToAnime),
      total: data.total,
      page: 1,
      limit: limitNum,
    });
  } catch (err) {
    logger.error({ err }, "Error searching anime");
    res.status(500).json({ error: "Failed to search anime" });
  }
});

router.get("/anime/trending", async (req, res): Promise<void> => {
  try {
    const { limit = "12" } = req.query as Record<string, string>;
    const limitNum = Math.min(parseInt(limit), 50);
    // Use Jikan for diverse top-rated anime (Kodik's sorted list is dominated by
    // 100+ translations of the same top title, making dedup impossible from one call)
    const data = await jikanGetTopAnime(limitNum);
    const results = data.data.map(mapJikanAnime).slice(0, limitNum);
    res.json({ results, total: results.length, page: 1, limit: limitNum });
  } catch (err) {
    logger.error({ err }, "Error fetching trending");
    res.status(500).json({ error: "Failed to fetch trending anime" });
  }
});

router.get("/anime/seasonal", async (req, res): Promise<void> => {
  try {
    const { limit = "20", season: seasonParam, year: yearParam } = req.query as Record<string, string>;
    const limitNum = Math.min(parseInt(limit), 50);
    const { season: curSeason, year: curYear } = getCurrentSeason();
    const season = seasonParam ?? curSeason;
    const year = yearParam ? parseInt(yearParam) : curYear;
    const data = await jikanGetSeasonal(season, year, limitNum + 10);
    const seen = new Set<number>();
    const unique = data.data.filter((a) => { if (seen.has(a.mal_id)) return false; seen.add(a.mal_id); return true; });
    const results = unique.map(mapJikanAnime).slice(0, limitNum);
    res.json({ results, total: results.length, page: 1, limit: limitNum });
  } catch (err) {
    logger.error({ err }, "Error fetching seasonal");
    res.status(500).json({ error: "Failed to fetch seasonal anime" });
  }
});

router.get("/anime/new-releases", async (req, res): Promise<void> => {
  try {
    const { limit = "20" } = req.query as Record<string, string>;
    const limitNum = Math.min(parseInt(limit), 50);
    const data = await kodikList({ limit: 100, sort: "updated_at", order: "desc", status: "ongoing" });
    const deduped = deduplicateByShikimoriId(data.results).slice(0, limitNum);
    res.json({
      results: deduped.map(mapKodikResultToAnime),
      total: deduped.length,
      page: 1,
      limit: limitNum,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching new releases");
    res.status(500).json({ error: "Failed to fetch new releases" });
  }
});

router.get("/anime/schedule", async (req, res): Promise<void> => {
  try {
    const { day } = req.query as Record<string, string>;
    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const filter = validDays.includes(day?.toLowerCase()) ? day.toLowerCase() : undefined;

    const url = new URL("https://api.jikan.moe/v4/schedules");
    url.searchParams.set("limit", "20");
    if (filter) url.searchParams.set("filter", filter);

    const r = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
    if (!r.ok) {
      res.status(502).json({ error: "Failed to fetch schedule from Jikan" });
      return;
    }

    const data = await r.json() as {
      data?: Array<{
        mal_id: number;
        title: string;
        title_english?: string;
        images?: { webp?: { image_url?: string }; jpg?: { image_url?: string } };
        score?: number;
        episodes?: number;
        type?: string;
        genres?: Array<{ name: string }>;
        broadcast?: { day?: string; time?: string; timezone?: string };
        synopsis?: string;
        status?: string;
      }>;
      pagination?: { has_next_page?: boolean };
    };

    const seen = new Set<number>();
    const results = (data.data ?? [])
            .filter((a) => (!a.type || a.type.toUpperCase() === "TV") && !seen.has(a.mal_id) && seen.add(a.mal_id) !== undefined)
      .map((a) => ({
        mal_id: a.mal_id,
        title: a.title_english ?? a.title,
        title_english: a.title_english ?? null,
        poster: a.images?.webp?.image_url ?? a.images?.jpg?.image_url ?? null,
        score: a.score ?? null,
        episodes: a.episodes ?? null,
        type: a.type ?? null,
        genres: (a.genres ?? []).map((g) => g.name),
        broadcast_day: a.broadcast?.day ?? null,
        broadcast_time: a.broadcast?.time ?? null,
        synopsis: a.synopsis ?? null,
        status: a.status ?? null,
      }));

    res.json({ results, day: filter ?? "all" });
  } catch (err) {
    logger.error({ err }, "Error fetching schedule");
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

router.get("/anime/:kodikId/episodes", async (req, res): Promise<void> => {
  try {
    const { result: firstResult, resolvedId: id } = await resolveAnimeById(req.params.kodikId);
    if (!firstResult) { res.status(404).json({ error: "Anime not found" }); return; }

    // Get all translations using the resolved Kodik ID
    const allResults = await kodikGetAllTranslations(id);
    const result = allResults[0];
    if (!result) {
      res.status(404).json({ error: "Anime not found" });
      return;
    }

    let episodes: Array<{ number: number; title: string | null; screenshot: string | null; airDate: string | null }> = [];

    if (result.seasons && Object.keys(result.seasons).length > 0) {
      for (const seasonData of Object.values(result.seasons)) {
        for (const [epNum] of Object.entries(seasonData.episodes)) {
          const num = parseInt(epNum);
          episodes.push({
            number: isNaN(num) ? episodes.length + 1 : num,
            title: null,
            screenshot: null,
            airDate: null,
          });
        }
      }
      episodes.sort((a, b) => a.number - b.number);
    } else {
      const count = result.episodes_count ?? result.material_data?.episodes_total ?? result.episodes_aired ?? 1;
      for (let i = 1; i <= Math.min(Number(count), 1000); i++) {
        episodes.push({ number: i, title: null, screenshot: null, airDate: null });
      }
    }

    // Build translations list from all results, dedup by translation id
    const seenTransIds = new Set<number>();
    const translations = allResults
      .map((r) => r.translation)
      .filter((t): t is NonNullable<typeof t> => !!t && !seenTransIds.has(t.id) && seenTransIds.add(t.id) !== undefined);

    if (translations.length === 0) {
      translations.push({ id: 1, title: "Оригинал", type: "subtitles" });
    }

    res.json({ episodes, translations });
  } catch (err) {
    logger.error({ err }, "Error fetching episodes");
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

router.get("/anime/:kodikId/stream/:episode/:translationId", async (req, res): Promise<void> => {
  try {
    const { result: firstResult, resolvedId: id } = await resolveAnimeById(req.params.kodikId);
    const episode = parseInt(Array.isArray(req.params.episode) ? req.params.episode[0] : req.params.episode);
    const translationId = parseInt(Array.isArray(req.params.translationId) ? req.params.translationId[0] : req.params.translationId);

    if (!firstResult) { res.status(404).json({ error: "Anime not found" }); return; }
    const allResults = await kodikGetAllTranslations(id);
    if (!allResults.length) {
      res.status(404).json({ error: "Anime not found" });
      return;
    }

    // Find result matching requested translation, fall back to first
    const result = allResults.find((r) => r.translation?.id === translationId) ?? allResults[0];

    let playerLink: string = result.link ?? "";

    if (result.seasons) {
      for (const seasonData of Object.values(result.seasons)) {
        const epData = seasonData.episodes[String(episode)];
        if (epData) {
          playerLink = String(epData);
          break;
        }
      }
    }

    const iframeUrl = playerLink.startsWith("//") ? `https:${playerLink}` : playerLink;

    // Try to extract HLS URLs for native playback
    const hlsUrls = await getKodikHLS(iframeUrl);

    if (hlsUrls && Object.keys(hlsUrls).length > 0) {
      const sortedQualities = Object.entries(hlsUrls).sort(([a], [b]) => parseInt(b) - parseInt(a));
      const defaultUrl = sortedQualities[0][1];
      res.json({
        url: defaultUrl,
        type: "hls",
        qualities: sortedQualities.map(([q, u]) => ({ label: `${q}p`, url: u })),
        subtitles: [],
        translation: result.translation ?? null,
      });
      return;
    }

    // Fall back to Kodik iframe
    res.json({
      url: iframeUrl,
      type: "iframe",
      qualities: [{ label: "Kodik Player", url: iframeUrl }],
      subtitles: [],
      translation: result.translation ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching stream");
    res.status(500).json({ error: "Failed to fetch stream" });
  }
});

router.get("/anime/:kodikId/related", async (req, res): Promise<void> => {
  try {
    const { result, resolvedId: id } = await resolveAnimeById(req.params.kodikId);
    if (!result) {
      res.json({ results: [], total: 0, page: 1, limit: 8 });
      return;
    }

    // Use material_data genres (where they actually live)
    const genres = result.material_data?.anime_genres ?? result.material_data?.all_genres ?? result.genres ?? [];
    if (!genres.length) {
      // Try related by same year/type
      const data = await kodikList({
        limit: 32,
        year: result.year ? String(result.year) : undefined,
        sort: "shikimori_rating",
        order: "desc",
      });
      const related = deduplicateByShikimoriId(data.results)
        .filter((r) => r.shikimori_id !== result.shikimori_id && r.id !== id)
        .slice(0, 8)
        .map(mapKodikResultToAnime);
      res.json({ results: related, total: related.length, page: 1, limit: 8 });
      return;
    }

    // Search by first genre, get more results to allow dedup
    const genre = genres[0];
    const data = await kodikList({ limit: 32, genres: genre });
    const related = deduplicateByShikimoriId(data.results)
      .filter((r) => r.shikimori_id !== result.shikimori_id && r.id !== id)
      .slice(0, 8)
      .map(mapKodikResultToAnime);

    res.json({ results: related, total: related.length, page: 1, limit: 8 });
  } catch (err) {
    logger.error({ err }, "Error fetching related");
    res.json({ results: [], total: 0, page: 1, limit: 8 });
  }
});

router.get("/anime/:kodikId", async (req, res): Promise<void> => {
  try {
    const { result } = await resolveAnimeById(req.params.kodikId);
    if (!result) {
      res.status(404).json({ error: "Anime not found" });
      return;
    }

    const base = mapKodikResultToAnime(result);
    let userLibraryStatus: string | null = null;
    let userRating: number | null = null;
    let communityRating: number | null = null;
    let ratingCount = 0;

    try {
      const userId = await getOrCreateUser(req);
      const animeId = base.id;

      const [libEntry] = await db
        .select()
        .from(libraryTable)
        .where(and(eq(libraryTable.userId, userId), eq(libraryTable.animeId, animeId)))
        .limit(1);
      if (libEntry) userLibraryStatus = libEntry.status;

      const [userRatingEntry] = await db
        .select()
        .from(ratingsTable)
        .where(and(eq(ratingsTable.userId, userId), eq(ratingsTable.animeId, animeId)))
        .limit(1);
      if (userRatingEntry) userRating = userRatingEntry.score;

      const allRatings = await db.select().from(ratingsTable).where(eq(ratingsTable.animeId, animeId));
      ratingCount = allRatings.length;
      if (ratingCount > 0) {
        communityRating = allRatings.reduce((sum, r) => sum + r.score, 0) / ratingCount;
      }
    } catch {
      // ignore session errors
    }

    res.json({ ...base, userLibraryStatus, userRating, communityRating, ratingCount });
  } catch (err) {
    logger.error({ err }, "Error fetching anime");
    res.status(500).json({ error: "Failed to fetch anime" });
  }
});

export default router;
