import { Link } from "wouter";
import { Play, ChevronRight, TrendingUp, Sparkles, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { translateGenre } from "@/lib/genres";
import {
  useGetTrending,
  useGetSeasonal,
  useGetNewReleases,
  useGetHistory,
  getGetTrendingQueryKey,
  getGetSeasonalQueryKey,
  getGetNewReleasesQueryKey,
  getGetHistoryQueryKey,
} from "@workspace/api-client-react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";

function AnimeRow({
  title,
  icon: Icon,
  href,
  children,
  loading,
}: {
  title: string;
  icon: React.ElementType;
  href?: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      <div className="flex items-center justify-between mb-4 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="text-base md:text-lg font-bold text-white">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm text-white/50 hover:text-primary transition-colors">
            Все <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="px-4 md:px-8">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {children}
          </div>
        )}
      </div>
    </motion.section>
  );
}

function HeroBanner() {
  const { data: trending, isLoading } = useGetTrending(
    { limit: 5 },
    { query: { queryKey: getGetTrendingQueryKey({ limit: 5 }) } }
  );

  const hero = trending?.results?.[0];

  if (isLoading || !hero) {
    return (
      <div className="relative h-[55vh] min-h-[360px] bg-muted animate-pulse flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>
    );
  }

  const bannerImg = (hero as { banner_image?: string }).banner_image ?? hero.poster;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative h-[60vh] min-h-[380px] md:h-[65vh] md:min-h-[440px] flex items-end overflow-hidden"
    >
      {bannerImg && (
        <img
          src={bannerImg}
          alt={hero.title}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-55"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />

      <div className="relative z-10 px-4 md:px-8 pb-10 md:pb-14 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="flex flex-wrap gap-1.5 mb-3">
            {hero.genres?.slice(0, 3).map((g) => (
              <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium">
                {translateGenre(g)}
              </span>
            ))}
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">{hero.title}</h1>
          {hero.description && (
            <p className="text-white/70 text-sm md:text-base mb-5 line-clamp-2 md:line-clamp-3">{hero.description}</p>
          )}
          <div className="flex gap-3 flex-wrap">
            <Link
              href={`/anime/${encodeURIComponent(hero.id)}`}
              className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg bg-primary hover:bg-primary/80 text-white font-semibold text-sm transition-colors"
              data-testid="button-hero-watch"
            >
              <Play className="w-4 h-4 fill-white" />
              Смотреть
            </Link>
            <Link
              href={`/anime/${encodeURIComponent(hero.id)}`}
              className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors backdrop-blur"
              data-testid="button-hero-details"
            >
              Подробнее
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ContinueWatching() {
  const { data, isLoading } = useGetHistory(
    { limit: 6 },
    { query: { queryKey: getGetHistoryQueryKey({ limit: 6 }) } }
  );

  const items = data?.items?.filter((i) => i.progress < 90 && i.progress > 5);
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-10 px-4 md:px-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-base md:text-lg font-bold text-white">Продолжить просмотр</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse h-24" />
            ))
          : items?.map((item) => (
              <Link
                key={item.id}
                href={`/watch/${encodeURIComponent(item.animeId)}/${item.episode}/1`}
                data-testid={`card-continue-${item.id}`}
              >
                <div className="flex gap-3 items-center rounded-xl bg-card border border-border p-3 hover:border-primary/40 hover:bg-card/80 transition-all group">
                  {item.animePoster && (
                    <img src={item.animePoster} alt={item.animeTitle} className="w-12 h-16 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.animeTitle}</p>
                    <p className="text-xs text-white/50 mt-0.5">Серия {item.episode}</p>
                    <div className="mt-2 h-1 rounded-full bg-white/10">
                      <div
                        className="h-1 rounded-full bg-primary"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-1">{Math.round(item.progress)}% просмотрено</p>
                  </div>
                  <Play className="w-4 h-4 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
      </div>
    </motion.section>
  );
}

export default function Home() {
  const { data: trending, isLoading: trendingLoading } = useGetTrending(
    { limit: 12 },
    { query: { queryKey: getGetTrendingQueryKey({ limit: 12 }) } }
  );
  const { data: seasonal, isLoading: seasonalLoading } = useGetSeasonal(
    { limit: 12 },
    { query: { queryKey: getGetSeasonalQueryKey({ limit: 12 }) } }
  );
  const { data: newReleases, isLoading: newReleasesLoading } = useGetNewReleases(
    { limit: 12 },
    { query: { queryKey: getGetNewReleasesQueryKey({ limit: 12 }) } }
  );

  return (
    <div className="min-h-screen">
      <HeroBanner />

      <div className="relative z-10 -mt-4">
        <ContinueWatching />

        <AnimeRow
          title="В тренде"
          icon={TrendingUp}
          href="/browse"
          loading={trendingLoading}
        >
          {trending?.results?.slice(0, 6).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </AnimeRow>

        <AnimeRow
          title="Этот сезон"
          icon={Calendar}
          href="/browse?tab=seasonal"
          loading={seasonalLoading}
        >
          {seasonal?.results?.slice(0, 6).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </AnimeRow>

        <AnimeRow
          title="Новинки"
          icon={Sparkles}
          href="/browse?tab=new"
          loading={newReleasesLoading}
        >
          {newReleases?.results?.slice(0, 6).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </AnimeRow>
      </div>
    </div>
  );
}
