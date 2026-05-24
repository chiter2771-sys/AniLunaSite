import { logger } from "./logger";

const KODIK_API_KEY = process.env.KODIK_API_KEY;
const KODIK_BASE = "https://kodik-api.com";

if (!KODIK_API_KEY) {
  logger.warn("KODIK_API_KEY not set — anime API calls will fail");
}

export interface KodikTranslation {
  id: number;
  title: string;
  type: string;
}

// Kodik episode values are plain URL strings, e.g. "//kodikplayer.com/seria/123/..."
export type KodikEpisode = string;

export interface KodikMaterialData {
  title?: string;
  anime_title?: string;
  title_en?: string;
  poster_url?: string;
  anime_poster_url?: string;
  description?: string;
  anime_description?: string;
  all_genres?: string[];
  anime_genres?: string[];
  all_status?: string;
  anime_status?: string;
  shikimori_rating?: number;
  shikimori_votes?: number;
  duration?: number;
  episodes_total?: number;
  episodes_aired?: number;
  aired_at?: string;
  next_episode_at?: string;
  anime_kind?: string;
  screenshots?: string[];
}

export interface KodikResult {
  id: string;
  type: string;
  link: string;
  title: string;
  title_orig?: string;
  other_title?: string;
  year?: number | string;
  status?: string | null;
  poster?: string;
  screenshots?: string[];
  genres?: string[];
  episodes_count?: number | null;
  episodes_aired?: number | null;
  shikimori_id?: string;
  shikimori_rating?: number;
  kinopoisk_id?: string;
  imdb_id?: string;
  description?: string;
  translation?: KodikTranslation;
  seasons?: Record<string, { episodes: Record<string, KodikEpisode> }>;
  created_at?: string;
  updated_at?: string;
  last_season?: number;
  last_episode?: number;
  material_data?: KodikMaterialData;
}

export interface KodikListResponse {
  time: string;
  total: number;
  prev_page?: string;
  next_page?: string;
  results: KodikResult[];
}

async function kodikFetch(path: string, params: Record<string, string | number | boolean | undefined>): Promise<unknown> {
  const url = new URL(`${KODIK_BASE}${path}`);
  url.searchParams.set("token", KODIK_API_KEY!);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    logger.error({ status: res.status, url: url.pathname }, "Kodik API error");
    throw new Error(`Kodik API error: ${res.status}`);
  }

  return res.json();
}

export async function kodikList(params: {
  limit?: number;
  genres?: string;
  year?: string;
  type?: string;
  status?: string;
  season?: string;
  with_episodes?: boolean;
  sort?: string;
  order?: string;
}): Promise<KodikListResponse> {
  const { type, ...rest } = params;
  return kodikFetch("/list", {
    ...rest,
    types: type || "anime-serial,anime",
    with_material_data: "true",
  }) as Promise<KodikListResponse>;
}

export async function kodikSearch(query: string, limit = 20): Promise<KodikListResponse> {
  return kodikFetch("/search", {
    title: query,
    limit,
    with_material_data: "true",
    types: "anime-serial,anime",
  }) as Promise<KodikListResponse>;
}

export async function kodikGetById(id: string): Promise<KodikResult | null> {
  const data = await kodikFetch("/search", {
    id,
    with_episodes: "true",
    with_material_data: "true",
  }) as KodikListResponse;

  return data.results?.[0] ?? null;
}

export async function kodikGetAllTranslations(id: string): Promise<KodikResult[]> {
  const first = await kodikGetById(id);
  if (!first) return [];

  if (first.shikimori_id) {
    const data = await kodikFetch("/search", {
      shikimori_id: first.shikimori_id,
      with_episodes: "true",
      with_material_data: "true",
    }) as KodikListResponse;
    return data.results?.length ? data.results : [first];
  }

  return [first];
}

export async function kodikGetByShikimoriId(shikimoriId: string): Promise<KodikResult | null> {
  const data = await kodikFetch("/search", {
    shikimori_id: shikimoriId,
    with_episodes: "true",
    with_material_data: "true",
  }) as KodikListResponse;

  return data.results?.[0] ?? null;
}

export function deduplicateByShikimoriId(results: KodikResult[]): KodikResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.shikimori_id ?? r.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getKodikHLS(iframeUrl: string): Promise<Record<string, string> | null> {
  try {
    const fullUrl = iframeUrl.startsWith("//") ? `https:${iframeUrl}` : iframeUrl;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const pageRes = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://aniluna.app",
      },
    });
    clearTimeout(timer);
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const paramsMatch =
      html.match(/var\s+videoParams\s*=\s*(\{[^;]+\})/s) ||
      html.match(/videoParams['"]\s*:\s*(\{[^}]+\})/s);
    if (!paramsMatch) return null;

    let params: Record<string, string>;
    try {
      params = JSON.parse(paramsMatch[1]);
    } catch {
      return null;
    }

    const urlObj = new URL(fullUrl);
    const isFilm = fullUrl.includes("/film/") || fullUrl.includes("/video/");
    const apiPath = isFilm ? "/api/anime/film" : "/api/anime/series";

    const formData = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined) formData.set(k, String(v));
    }
    formData.set("bad_user", "false");
    formData.set("cdn_is_working", "true");

    const apiRes = await fetch(`${urlObj.origin}${apiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": fullUrl,
        "Origin": urlObj.origin,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!apiRes.ok) return null;

    const data = await apiRes.json() as { links?: Record<string, Array<{ src: string; type: string }>> };
    if (!data.links) return null;

    const result: Record<string, string> = {};
    for (const [quality, sources] of Object.entries(data.links)) {
      if (!Array.isArray(sources)) continue;
      const src = sources.find((s) => s.type === "application/x-mpegURL" || String(s.src ?? "").includes(".m3u8"));
      if (src?.src) {
        result[quality] = src.src.startsWith("//") ? `https:${src.src}` : src.src;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export function encodeKodikId(kodikId: string): string {
  return Buffer.from(kodikId).toString("base64url");
}

export function decodeKodikId(encoded: string): string {
  try {
    return Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return encoded;
  }
}

// Encode a Shikimori/MAL ID so routes can distinguish it from Kodik IDs
export function encodeShikimoriRef(malId: number | string): string {
  return Buffer.from(`shik:${malId}`).toString("base64url");
}

// Returns the numeric shikimori_id if the decoded string carries one, else null
export function extractShikimoriRef(decoded: string): string | null {
  if (decoded.startsWith("shik:")) return decoded.slice(5);
  return null;
}

export function mapKodikResultToAnime(result: KodikResult) {
  const md = result.material_data;

  const poster =
    md?.anime_poster_url ??
    md?.poster_url ??
    result.poster ??
    null;

  const description = md?.anime_description ?? md?.description ?? result.description ?? null;

  const genres = md?.anime_genres ?? md?.all_genres ?? result.genres ?? [];

  const status = md?.anime_status ?? md?.all_status ?? result.status ?? null;

  const shikimoriRating = md?.shikimori_rating ?? result.shikimori_rating ?? null;

  const episodesAired = md?.episodes_aired ?? result.episodes_aired ?? null;
  const episodesCount =
    md?.episodes_total ?? result.episodes_count ?? null;

  // Prefer Kodik's own screenshot list for display; fall back to material_data (Shikimori) screenshots
  const screenshots = result.screenshots ?? md?.screenshots ?? [];
  // For the hero banner use a shikimori-hosted screenshot (reliable) or fall back to poster
  const bannerImage = md?.screenshots?.[0] ?? poster ?? screenshots[0] ?? null;

  // Normalise the player link: //kodikplayer.com/... → https://kodik.info/...
  const rawLink = result.link ?? "";
  const playerLink = rawLink.startsWith("//")
    ? `https:${rawLink}`
    : rawLink;

  return {
    id: encodeKodikId(result.id),
    kodik_id: result.id,
    title: result.title,
    title_orig: result.title_orig ?? null,
    other_title: result.other_title ?? null,
    type: result.type,
    year: result.year && Number(result.year) > 0 ? Number(result.year) : null,
    status,
    poster,
    banner_image: bannerImage,
    screenshots,
    genres,
    episodes_count: episodesCount,
    episodes_aired: episodesAired,
    shikimori_id: result.shikimori_id ?? null,
    shikimori_rating: shikimoriRating,
    kinopoisk_id: result.kinopoisk_id ?? null,
    imdb_id: result.imdb_id ?? null,
    description,
    translations: result.translation ? [result.translation] : [],
    last_episode: result.last_episode ?? null,
    last_season: result.last_season ?? null,
    link: playerLink,
  };
}
