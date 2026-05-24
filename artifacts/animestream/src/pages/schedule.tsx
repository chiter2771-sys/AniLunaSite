import { motion } from "framer-motion";
import { Calendar, Clock, Star, ChevronRight, Tv2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { translateGenre } from "@/lib/genres";
import { customFetch } from "@workspace/api-client-react";

interface ScheduleAnimeItem {
  mal_id: number;
  title: string;
  title_english: string | null;
  poster: string | null;
  score: number | null;
  episodes: number | null;
  type: string | null;
  genres: string[];
  broadcast_day: string | null;
  broadcast_time: string | null;
  synopsis: string | null;
  status: string | null;
}

const DAYS_RU: Record<string, string> = {
  Mondays: "Понедельник",
  Tuesdays: "Вторник",
  Wednesdays: "Среда",
  Thursdays: "Четверг",
  Fridays: "Пятница",
  Saturdays: "Суббота",
  Sundays: "Воскресенье",
};

const DAYS_SHORT: Record<string, string> = {
  Mondays: "Пн",
  Tuesdays: "Вт",
  Wednesdays: "Ср",
  Thursdays: "Чт",
  Fridays: "Пт",
  Saturdays: "Сб",
  Sundays: "Вс",
};

const DAY_FILTER: Record<string, string> = {
  Mondays: "monday",
  Tuesdays: "tuesday",
  Wednesdays: "wednesday",
  Thursdays: "thursday",
  Fridays: "friday",
  Saturdays: "saturday",
  Sundays: "sunday",
};

const DAY_ORDER = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

const TODAY_MAP: Record<number, string> = {
  1: "Mondays",
  2: "Tuesdays",
  3: "Wednesdays",
  4: "Thursdays",
  5: "Fridays",
  6: "Saturdays",
  0: "Sundays",
};

async function fetchDaySchedule(day: string): Promise<ScheduleAnimeItem[]> {
  const filter = DAY_FILTER[day];
  const data = await customFetch<{ results: ScheduleAnimeItem[] }>(`/api/anime/schedule${filter ? `?day=${filter}` : ""}`);
  return data.results;
}

function AnimeScheduleCard({ anime, isToday }: { anime: ScheduleAnimeItem; isToday: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 p-3 rounded-xl border transition-all hover:border-primary/40 hover:bg-white/5 group",
        isToday ? "bg-primary/5 border-primary/20" : "bg-card border-border"
      )}
    >
      <div className="shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-white/5">
        {anime.poster ? (
          <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <Tv2 className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-tight">{anime.title}</p>
        {anime.title_english && anime.title_english !== anime.title && (
          <p className="text-xs text-white/40 truncate mt-0.5">{anime.title_english}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {anime.broadcast_time && (
            <span className="flex items-center gap-0.5 text-xs text-white/55">
              <Clock className="w-3 h-3" />
              {anime.broadcast_time} JST
            </span>
          )}
          {anime.score && anime.score > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-400/80">
              <Star className="w-3 h-3 fill-yellow-400/80" />
              {anime.score.toFixed(1)}
            </span>
          )}
          {anime.episodes && (
            <span className="text-xs text-white/40">{anime.episodes} эп.</span>
          )}
        </div>
        {anime.genres.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {anime.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10">
                {translateGenre(g)}
              </span>
            ))}
          </div>
        )}
      </div>
      <a
        href={`https://myanimelist.net/anime/${anime.mal_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 self-start"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-4 h-4 text-white/50" />
      </a>
    </motion.div>
  );
}

export default function Schedule() {
  const todayKey = TODAY_MAP[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState<string>(todayKey ?? "Mondays");

  const { data: animeList, isLoading, error } = useQuery({
    queryKey: ["schedule", selectedDay],
    queryFn: () => fetchDaySchedule(selectedDay),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Расписание выхода</h1>
            <p className="text-white/50 text-sm">Аниме текущего сезона по дням недели</p>
          </div>
        </div>
      </motion.div>

      {/* Day tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {DAY_ORDER.map((day) => {
          const isToday = day === todayKey;
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0",
                isSelected
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : isToday
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-card border border-border text-white/60 hover:text-white hover:border-white/20"
              )}
            >
              <span className="font-bold">{DAYS_SHORT[day]}</span>
              {isToday && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Main list */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Tv2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">{DAYS_RU[selectedDay] ?? selectedDay}</h2>
            {selectedDay === todayKey && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                Сегодня
              </span>
            )}
            {!isLoading && animeList && (
              <span className="text-xs text-white/40 ml-1">{animeList.length} тайтлов</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[88px] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 text-white/40">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Не удалось загрузить расписание</p>
              <p className="text-sm mt-1 text-white/30">Попробуйте позже</p>
            </div>
          ) : !animeList || animeList.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Нет данных для этого дня</p>
            </div>
          ) : (
            <div className="space-y-2">
              {animeList.map((anime) => (
                <AnimeScheduleCard
                  key={anime.mal_id}
                  anime={anime}
                  isToday={selectedDay === todayKey}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:w-56 lg:w-64 shrink-0">
          <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Вся неделя</h3>
          <div className="space-y-1">
            {DAY_ORDER.map((day) => {
              const isToday = day === todayKey;
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all",
                    isSelected
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary" : "bg-primary/70")} />
                    )}
                    <span className={cn(isToday && !isSelected && "text-primary/80")}>{DAYS_RU[day]}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-3 rounded-xl bg-card border border-border">
            <p className="text-xs text-white/40 text-center">Источник данных</p>
            <p className="text-xs text-white/60 text-center font-medium mt-0.5">MyAnimeList · Jikan API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
