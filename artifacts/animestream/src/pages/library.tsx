import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookMarked, Star, Trash2 } from "lucide-react";
import {
  useGetLibrary, useRemoveFromLibrary,
  getGetLibraryQueryKey, GetLibraryStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "", label: "Все" },
  { value: "watching", label: "Смотрю" },
  { value: "completed", label: "Просмотрено" },
  { value: "plan_to_watch", label: "Буду смотреть" },
  { value: "on_hold", label: "Отложено" },
  { value: "dropped", label: "Брошено" },
];

const STATUS_RU: Record<string, string> = {
  watching: "Смотрю",
  completed: "Просмотрено",
  plan_to_watch: "Буду смотреть",
  on_hold: "Отложено",
  dropped: "Брошено",
};

export default function Library() {
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const params = { status: (status || undefined) as typeof GetLibraryStatus[keyof typeof GetLibraryStatus] | undefined, limit: 50 };
  const { data, isLoading } = useGetLibrary(params, {
    query: { queryKey: getGetLibraryQueryKey(params) },
  });
  const removeFromLibrary = useRemoveFromLibrary();

  const handleRemove = (id: number) => {
    removeFromLibrary.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetLibraryQueryKey({}) });
          toast({ title: "Удалено из библиотеки" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookMarked className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Моя библиотека</h1>
        {data?.total !== undefined && (
          <span className="text-sm text-white/40">{data.total} тайтлов</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
              status === tab.value
                ? "bg-primary text-white"
                : "bg-card border border-border text-white/60 hover:text-white"
            )}
            data-testid={`tab-library-${tab.value || "all"}`}
          >
            {tab.label}
            {tab.value && data?.counts?.[tab.value as keyof typeof data.counts] !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">
                {data.counts[tab.value as keyof typeof data.counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[2/3]" />
          ))}
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-24 text-white/30">
          <BookMarked className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Библиотека пуста</p>
          <Link href="/browse" className="text-primary text-sm hover:underline mt-2 block">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {data?.items?.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative"
              data-testid={`card-library-${item.id}`}
            >
              <Link href={`/anime/${encodeURIComponent(item.animeId)}`}>
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                  {item.animePoster ? (
                    <img src={item.animePoster} alt={item.animeTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                    {item.status && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", {
                        "bg-blue-500/80": item.status === "watching",
                        "bg-green-500/80": item.status === "completed",
                        "bg-gray-500/80": item.status === "plan_to_watch",
                        "bg-yellow-500/80": item.status === "on_hold",
                        "bg-red-500/80": item.status === "dropped",
                      })}>
                        {STATUS_RU[item.status] ?? item.status}
                      </span>
                    )}
                  </div>

                  {item.userRating && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-xs text-yellow-400 font-semibold">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {item.userRating}
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-1.5">
                <p className="text-xs font-medium text-white truncate">{item.animeTitle}</p>
                {item.totalEpisodes && (
                  <p className="text-xs text-white/40 mt-0.5">
                    {item.episodesWatched}/{item.totalEpisodes} сер.
                  </p>
                )}
              </div>

              <button
                onClick={() => handleRemove(item.id)}
                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                data-testid={`button-remove-library-${item.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
