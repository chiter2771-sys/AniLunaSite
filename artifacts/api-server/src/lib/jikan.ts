import { logger } from "./logger";
import { getRuTitle, getRuDescription } from "./ru-translations";
import { encodeShikimoriRef } from "./kodik";

const JIKAN_BASE = "https://api.jikan.moe/v4";

// Simple in-memory rate limiting (Jikan allows 3 req/sec, 60/min)
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 350;

async function jikanFetch(path: string, params: Record<string, string | number | undefined> = {}): Promise<unknown> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const url = new URL(`${JIKAN_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    logger.error({ status: res.status, url: url.pathname }, "Jikan API error");
    throw new Error(`Jikan API error: ${res.status}`);
  }

  return res.json();
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  titles?: Array<{ type: string; title: string }>;
  type?: string;
  episodes?: number;
  status?: string;
  airing?: boolean;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  synopsis?: string;
  season?: string;
  year?: number;
  images?: {
    jpg?: { large_image_url?: string; image_url?: string };
    webp?: { large_image_url?: string; image_url?: string };
  };
  genres?: Array<{ mal_id: number; name: string }>;
  themes?: Array<{ mal_id: number; name: string }>;
  demographics?: Array<{ mal_id: number; name: string }>;
  studios?: Array<{ mal_id: number; name: string }>;
  aired?: { from?: string; to?: string; string?: string };
  trailer?: { embed_url?: string; youtube_id?: string | null };
  duration?: string;
  rating?: string;
  broadcast?: { day?: string; time?: string; timezone?: string; string?: string };
}

export interface JikanPaginatedResponse {
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: { count: number; total: number; per_page: number };
  };
  data: JikanAnime[];
}

export interface JikanAnimeResponse {
  data: JikanAnime;
}

export interface JikanEpisode {
  mal_id: number;
  title?: string;
  title_japanese?: string;
  aired?: string;
  score?: number;
  filler?: boolean;
  recap?: boolean;
}

export interface JikanEpisodesResponse {
  pagination: { last_visible_page: number; has_next_page: boolean };
  data: JikanEpisode[];
}

export function mapJikanAnime(anime: JikanAnime) {
  const poster = anime.images?.webp?.large_image_url
    ?? anime.images?.jpg?.large_image_url
    ?? anime.images?.webp?.image_url
    ?? anime.images?.jpg?.image_url
    ?? null;

  const genres = [
    ...(anime.genres ?? []),
    ...(anime.themes ?? []),
    ...(anime.demographics ?? []),
  ].map((g) => g.name);

  const youtubeId = anime.trailer?.youtube_id ?? null;
  const bannerImage = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    : null;

  const jikanRuTitle = anime.titles?.find((t) => t.type === "Russian")?.title ?? null;
  const staticRuTitle = getRuTitle(anime.mal_id);
  const staticRuDesc = getRuDescription(anime.mal_id);

  return {
    id: encodeShikimoriRef(anime.mal_id),
    title: staticRuTitle ?? jikanRuTitle ?? anime.title_english ?? anime.title,
    title_orig: anime.title_english ?? anime.title,
    other_title: anime.title_japanese ?? null,
    type: anime.type?.toLowerCase() === "tv" ? "anime-serial" : "anime",
    year: anime.year ? String(anime.year) : (anime.aired?.from ? String(new Date(anime.aired.from).getFullYear()) : null),
    status: anime.status?.includes("Finished") ? "released" : anime.airing ? "ongoing" : "anons",
    poster,
    banner_image: bannerImage,
    screenshots: [],
    genres,
    episodes_count: anime.episodes ?? null,
    episodes_aired: anime.airing ? null : (anime.episodes ?? null),
    shikimori_id: null,
    shikimori_rating: anime.score ?? null,
    kinopoisk_id: null,
    imdb_id: null,
    description: staticRuDesc ?? anime.synopsis ?? null,
    translations: [
      { id: 1, title: "Субтитры (Crunchyroll)", type: "subtitles" },
      { id: 2, title: "Дубляж", type: "voice" },
    ],
    mal_id: anime.mal_id,
    studios: anime.studios?.map((s) => s.name) ?? [],
    season: anime.season ?? null,
    rating: anime.rating ?? null,
    scored_by: anime.scored_by ?? null,
    rank: anime.rank ?? null,
  };
}

export async function jikanGetTopAnime(limit = 12, page = 1): Promise<JikanPaginatedResponse> {
  return jikanFetch("/top/anime", { limit, page }) as Promise<JikanPaginatedResponse>;
}

export async function jikanGetSeasonal(season?: string, year?: number, limit = 20): Promise<JikanPaginatedResponse> {
  const endpoint = season && year ? `/seasons/${year}/${season}` : "/seasons/now";
  return jikanFetch(endpoint, { limit }) as Promise<JikanPaginatedResponse>;
}

export async function jikanSearch(query: string, limit = 20, genres?: string, type?: string, status?: string, order_by?: string, page = 1): Promise<JikanPaginatedResponse> {
  const params: Record<string, string | number | undefined> = {
    limit,
    page,
  };
  if (query) params.q = query;
  if (genres) params.genres = genres;
  if (type) params.type = type;
  if (status) params.status = status;
  if (order_by) params.order_by = order_by;

  return jikanFetch("/anime", params) as Promise<JikanPaginatedResponse>;
}

export async function jikanGetById(malId: number): Promise<JikanAnime | null> {
  const data = await jikanFetch(`/anime/${malId}`) as JikanAnimeResponse;
  return data.data ?? null;
}

export async function jikanGetEpisodes(malId: number, page = 1): Promise<JikanEpisodesResponse> {
  return jikanFetch(`/anime/${malId}/episodes`, { page }) as Promise<JikanEpisodesResponse>;
}

export async function jikanGetRecommendations(malId: number): Promise<{ data: Array<{ entry: JikanAnime }> }> {
  return jikanFetch(`/anime/${malId}/recommendations`) as Promise<{ data: Array<{ entry: JikanAnime }> }>;
}

// Demo HLS streams for the custom player (rotating based on anime ID)
const DEMO_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
];

export function getDemoStream(malId: number, episode: number) {
  const idx = (malId + episode) % DEMO_STREAMS.length;
  return DEMO_STREAMS[idx];
}
