import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, X } from "lucide-react";
import { useSearchAnime, getSearchAnimeQueryKey } from "@workspace/api-client-react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { useDebounce } from "@/hooks/use-debounce";

export default function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const { data, isLoading } = useSearchAnime(
    { q: debouncedQuery, limit: 24 },
    {
      query: {
        enabled: debouncedQuery.length >= 2,
        queryKey: getSearchAnimeQueryKey({ q: debouncedQuery, limit: 24 }),
      },
    }
  );

  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mb-10"
      >
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Поиск аниме</h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-12 pr-12 py-4 bg-card border border-border rounded-xl text-white placeholder:text-white/30 text-base focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            data-testid="input-search"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              data-testid="button-clear-search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!debouncedQuery || debouncedQuery.length < 2 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-24 text-white/30"
          >
            <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Введите название для поиска...</p>
          </motion.div>
        ) : isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4"
          >
            {Array.from({ length: 12 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
          </motion.div>
        ) : data?.results?.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-24 text-white/30"
          >
            <p className="text-lg">Ничего не найдено по запросу «{debouncedQuery}»</p>
            <p className="text-sm mt-2">Попробуйте другое название</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-sm text-white/40 mb-4">{data?.total ?? 0} результатов по запросу «{debouncedQuery}»</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
              {data?.results?.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
