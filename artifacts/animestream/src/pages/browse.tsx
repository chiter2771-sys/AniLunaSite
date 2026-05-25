import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, ChevronDown } from "lucide-react";
import { useListAnime, getListAnimeQueryKey } from "@workspace/api-client-react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GENRES = [
  { value: "1", label: "Боевик" },
  { value: "2", label: "Приключения" },
  { value: "4", label: "Комедия" },
  { value: "8", label: "Драма" },
  { value: "10", label: "Фэнтези" },
  { value: "14", label: "Ужасы" },
  { value: "18", label: "Меха" },
  { value: "7", label: "Детектив" },
  { value: "62", label: "Исекай" },
  { value: "22", label: "Романтика" },
  { value: "24", label: "Фантастика" },
  { value: "42", label: "Сэйнэн" },
  { value: "27", label: "Сёнэн" },
  { value: "25", label: "Сёдзё" },
  { value: "36", label: "Повседневность" },
  { value: "30", label: "Спорт" },
  { value: "37", label: "Сверхъестественное" },
  { value: "41", label: "Триллер" },
  { value: "40", label: "Психологическое" },
];

const YEARS = Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) => String(new Date().getFullYear() - i));

const TYPES = [
  { value: "anime-serial", label: "Сериал" },
  { value: "anime", label: "Фильм" },
];

const STATUSES = [
  { value: "ongoing", label: "Выходит" },
  { value: "released", label: "Завершён" },
  { value: "anons", label: "Анонс" },
];

export default function Browse() {
  const [genre, setGenre] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);

  const params = {
    page,
    limit: 24,
    ...(genre ? { genres: genre } : {}),
    ...(year ? { year } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };

  const { data, isLoading } = useListAnime(params, {
    query: { queryKey: getListAnimeQueryKey(params) },
  });

  const totalPages = data ? Math.ceil(data.total / 24) : 1;

  const clearFilters = () => {
    setGenre("");
    setYear("");
    setType("");
    setStatus("");
    setPage(1);
  };

  const hasFilters = genre || year || type || status;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl md:text-2xl font-bold text-white mb-5">Каталог аниме</h1>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-white/50 shrink-0" />

          <Button
            variant="outline"
            size="sm"
            className="bg-card border-border text-sm text-white/80 hover:text-white"
            onClick={() => setGenreModalOpen(true)}
            data-testid="button-open-genre-modal"
          >
            {genre ? (GENRES.find((g) => g.value === genre)?.label ?? "Жанр") : "Жанр"}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-card border-border text-sm text-white/80 hover:text-white"
            onClick={() => setYearModalOpen(true)}
            data-testid="button-open-year-modal"
          >
            {year || "Год"}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <Select value={type} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-28 bg-card border-border text-sm" data-testid="select-type">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-30 bg-card border-border text-sm" data-testid="select-status">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любой статус</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-white/50 hover:text-white text-sm">
              Сбросить
            </Button>
          )}

          {data && (
            <span className="ml-auto text-xs text-white/40">{data.total.toLocaleString()} результатов</span>
          )}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 24 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4"
        >
          {data?.results?.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </motion.div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            data-testid="button-prev-page"
          >
            Назад
          </Button>
          <span className="text-sm text-white/50">Стр. {page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            data-testid="button-next-page"
          >
            Вперёд
          </Button>
        </div>
      )}

      <Dialog open={genreModalOpen} onOpenChange={setGenreModalOpen}>
        <DialogContent className="max-w-md bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle>Выбор жанра</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
            <button
              onClick={() => { setGenre(""); setPage(1); setGenreModalOpen(false); }}
              className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", !genre ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white/80")}
            >
              Все жанры
            </button>
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => { setGenre(g.value); setPage(1); setGenreModalOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", genre === g.value ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white/80")}
              >
                {g.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={yearModalOpen} onOpenChange={setYearModalOpen}>
        <DialogContent className="max-w-md bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle>Выбор года</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
            <button
              onClick={() => { setYear(""); setPage(1); setYearModalOpen(false); }}
              className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", !year ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white/80")}
            >
              Любой год
            </button>
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => { setYear(y); setPage(1); setYearModalOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", year === y ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white/80")}
              >
                {y}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
