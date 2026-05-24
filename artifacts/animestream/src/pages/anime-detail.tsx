import { useParams, Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { translateGenre } from "@/lib/genres";
import {
  Play, Plus, Check, Star, BookMarked, ChevronDown, MessageSquare,
} from "lucide-react";
import {
  useGetAnime, useGetAnimeEpisodes, useGetRelatedAnime, useGetComments,
  useGetAnimeRating, useAddToLibrary, useRateAnime,
  useCreateComment, useToggleCommentLike, useDeleteComment, useGetProfile,
  getGetAnimeQueryKey, getGetAnimeEpisodesQueryKey, getGetRelatedAnimeQueryKey,
  getGetCommentsQueryKey, getGetAnimeRatingQueryKey,
  LibraryEntryInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimeCard } from "@/components/anime-card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  watching: "Смотрю",
  completed: "Просмотрено",
  plan_to_watch: "Буду смотреть",
  dropped: "Брошено",
  on_hold: "Отложено",
};

const TYPE_LABELS: Record<string, string> = {
  "anime-serial": "Сериал",
  "anime": "Фильм",
  "TV": "Сериал",
  "Movie": "Фильм",
  "OVA": "OVA",
  "ONA": "ONA",
  "Special": "Спешл",
};

const STATUS_MAP: Record<string, string> = {
  released: "Завершён",
  ongoing: "Выходит",
  anons: "Анонс",
};

function StarRating({ animeId, animeTitle }: { animeId: string; animeTitle: string }) {
  const qc = useQueryClient();
  const { data } = useGetAnimeRating(animeId, {
    query: { queryKey: getGetAnimeRatingQueryKey(animeId) },
  });
  const rateAnime = useRateAnime();
  const [hovering, setHovering] = useState(0);
  const { toast } = useToast();

  const userRating = data?.userRating ?? 0;
  const display = hovering || userRating;

  const handleRate = (score: number) => {
    rateAnime.mutate(
      { data: { animeId, score, animeTitle } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetAnimeRatingQueryKey(animeId) });
          toast({ title: `Оценка ${score}/10 выставлена` });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5 md:gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHovering(star)}
            onMouseLeave={() => setHovering(0)}
            onClick={() => handleRate(star)}
            className={cn(
              "w-5 h-5 md:w-6 md:h-6 rounded transition-all",
              star <= display ? "text-yellow-400" : "text-white/20"
            )}
            data-testid={`button-star-${star}`}
          >
            <Star className={cn("w-4 h-4 md:w-5 md:h-5", star <= display && "fill-yellow-400")} />
          </button>
        ))}
        {userRating > 0 && <span className="text-sm text-yellow-400 ml-1 font-semibold">{userRating}/10</span>}
      </div>
      {data && data.count > 0 && (
        <p className="text-xs text-white/40">
          Оценка сообщества: {data.average.toFixed(1)}/10 ({data.count} голосов)
        </p>
      )}
    </div>
  );
}

function CommentsSection({ animeId }: { animeId: string }) {
  const qc = useQueryClient();
  const { data: profile } = useGetProfile();
  const { data, isLoading } = useGetComments(animeId, {
    query: { queryKey: getGetCommentsQueryKey(animeId) },
  });
  const createComment = useCreateComment();
  const toggleLike = useToggleCommentLike();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createComment.mutate(
      { data: { animeId, text: text.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(animeId) });
          setText("");
          toast({ title: "Комментарий опубликован" });
        },
        onError: () => toast({ title: "Ошибка публикации комментария", variant: "destructive" }),
      }
    );
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        Комментарии {data?.total ? `(${data.total})` : ""}
      </h3>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Поделитесь мнением..."
          rows={3}
          className="w-full p-3 rounded-xl bg-card border border-border text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-primary/60 transition-colors"
          data-testid="input-comment"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!text.trim() || createComment.isPending}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            data-testid="button-submit-comment"
          >
            {createComment.isPending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            </div>
          ))
        ) : (
          data?.comments?.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {comment.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{comment.username}</span>
                  <span className="text-xs text-white/30">
                    {new Date(comment.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <p className="text-sm text-white/80">{comment.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() =>
                      toggleLike.mutate(
                        { id: comment.id },
                        { onSuccess: () => qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(animeId) }) }
                      )
                    }
                    className={cn(
                      "flex items-center gap-1 text-xs transition-colors",
                      comment.liked ? "text-primary" : "text-white/40 hover:text-white"
                    )}
                    data-testid={`button-like-comment-${comment.id}`}
                  >
                    <Star className="w-3 h-3" />
                    {comment.likes}
                  </button>
                  {profile?.id === comment.userId && (
                    <button
                      onClick={() =>
                        deleteComment.mutate(
                          { id: comment.id },
                          { onSuccess: () => qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(animeId) }) }
                        )
                      }
                      className="text-xs text-white/30 hover:text-destructive transition-colors"
                      data-testid={`button-delete-comment-${comment.id}`}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const kodikId = decodeURIComponent(id ?? "");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: anime, isLoading } = useGetAnime(kodikId, {
    query: { enabled: !!kodikId, queryKey: getGetAnimeQueryKey(kodikId) },
  });
  const { data: episodes, isLoading: epLoading } = useGetAnimeEpisodes(kodikId, {
    query: { enabled: !!kodikId, queryKey: getGetAnimeEpisodesQueryKey(kodikId) },
  });
  const { data: related } = useGetRelatedAnime(kodikId, {
    query: { enabled: !!kodikId, queryKey: getGetRelatedAnimeQueryKey(kodikId) },
  });

  const addToLibrary = useAddToLibrary();
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  const visibleEpisodes = showAllEpisodes
    ? (episodes?.episodes ?? [])
    : (episodes?.episodes ?? []).slice(0, 12);

  const handleAddToLibrary = (status: string) => {
    if (!anime) return;
    addToLibrary.mutate(
      {
        data: {
          animeId: kodikId,
          animeTitle: anime.title,
          animePoster: anime.poster ?? undefined,
          animeType: anime.type ?? "anime",
          status: status as typeof LibraryEntryInputStatus[keyof typeof LibraryEntryInputStatus],
          totalEpisodes: anime.episodes_count ?? undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetAnimeQueryKey(kodikId) });
          toast({ title: `Добавлено: «${STATUS_LABELS[status]}»` });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="h-64 bg-muted" />
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-4 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Аниме не найдено
      </div>
    );
  }

  const firstEp = episodes?.episodes?.[0];
  const firstTrans = episodes?.translations?.[0];
  const bannerImage = (anime as { banner_image?: string }).banner_image ?? anime.poster;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-64 md:h-80 overflow-hidden bg-black">
        {bannerImage && (
          <img
            src={bannerImage}
            alt={anime.title}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-60"
          />
        )}
        {!bannerImage && anime.poster && (
          <img
            src={anime.poster}
            alt={anime.title}
            className="absolute right-0 top-0 h-full w-auto object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      </div>

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 -mt-28 md:-mt-36 relative z-10">
        <div className="flex gap-4 md:gap-6">
          {anime.poster && (
            <div className="shrink-0">
              <img
                src={anime.poster}
                alt={anime.title}
                className="w-28 md:w-44 rounded-xl shadow-2xl shadow-black/60 border border-white/10"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {anime.genres?.slice(0, 3).map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium">
                  {translateGenre(g)}
                </span>
              ))}
            </div>

            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-1 leading-tight">{anime.title}</h1>
            {anime.title_orig && <p className="text-white/50 text-sm mb-1">{anime.title_orig}</p>}
            <div className="flex flex-wrap gap-2 text-xs md:text-sm text-white/50 mb-3 md:mb-4">
              {anime.year && <span>{anime.year}</span>}
              {anime.type && <span>{TYPE_LABELS[anime.type] ?? anime.type}</span>}
              {anime.episodes_count && <span>{anime.episodes_count} серий</span>}
              {anime.status && <span>{STATUS_MAP[anime.status] ?? anime.status}</span>}
              {anime.shikimori_rating && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {anime.shikimori_rating.toFixed(1)}
                </span>
              )}
            </div>

            {anime.description && (
              <p className="text-white/70 text-xs md:text-sm mb-4 md:mb-6 max-w-2xl leading-relaxed line-clamp-4 md:line-clamp-none">{anime.description}</p>
            )}

            <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
              {firstEp && firstTrans && (
                <Link
                  href={`/watch/${encodeURIComponent(kodikId)}/${firstEp.number}/${firstTrans.id}`}
                  className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg bg-primary hover:bg-primary/80 text-white font-semibold text-sm transition-colors"
                  data-testid="button-watch"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Смотреть
                </Link>
              )}

              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
                  data-testid="button-add-library"
                >
                  {anime.userLibraryStatus ? (
                    <><Check className="w-4 h-4" />{STATUS_LABELS[anime.userLibraryStatus]}</>
                  ) : (
                    <><Plus className="w-4 h-4" />В библиотеку</>
                  )}
                </button>
                <div className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-card border border-border shadow-2xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => handleAddToLibrary(value)}
                      className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl transition-colors"
                      data-testid={`button-library-${value}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <StarRating animeId={kodikId} animeTitle={anime.title} />
          </div>
        </div>

        {/* Episodes */}
        <div className="mt-10 md:mt-12">
          <h2 className="text-xl font-bold text-white mb-4">
            Серии
            {epLoading && <span className="ml-2 text-sm text-white/40 font-normal">Загрузка...</span>}
          </h2>

          {episodes?.translations && episodes.translations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {episodes.translations.map((t) => (
                <span key={t.id} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70">
                  {t.title}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {visibleEpisodes.map((ep) => (
              <Link
                key={ep.number}
                href={`/watch/${encodeURIComponent(kodikId)}/${ep.number}/${episodes?.translations?.[0]?.id ?? 1}`}
                data-testid={`button-episode-${ep.number}`}
              >
                <div className="aspect-square flex items-center justify-center rounded-lg bg-card border border-border hover:border-primary/60 hover:bg-primary/10 text-sm font-medium text-white/70 hover:text-white transition-all cursor-pointer">
                  {ep.number}
                </div>
              </Link>
            ))}
          </div>

          {(episodes?.episodes?.length ?? 0) > 12 && (
            <button
              onClick={() => setShowAllEpisodes(!showAllEpisodes)}
              className="mt-4 flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
              data-testid="button-show-all-episodes"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", showAllEpisodes && "rotate-180")} />
              {showAllEpisodes ? "Свернуть" : `Показать все ${episodes?.episodes?.length} серий`}
            </button>
          )}
        </div>

        {/* Comments */}
        <div className="mt-10 md:mt-12">
          <CommentsSection animeId={kodikId} />
        </div>

        {/* Related */}
        {related?.results && related.results.length > 0 && (
          <div className="mt-10 md:mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Похожее аниме</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
              {related.results.slice(0, 6).map((a) => (
                <AnimeCard key={a.id} anime={a} />
              ))}
            </div>
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  );
}
