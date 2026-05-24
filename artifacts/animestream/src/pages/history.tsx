import { Link } from "wouter";
import { motion } from "framer-motion";
import { History as HistoryIcon, Play, Trash2 } from "lucide-react";
import {
  useGetHistory, useDeleteHistory,
  getGetHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetHistory(
    { limit: 50 },
    { query: { queryKey: getGetHistoryQueryKey({ limit: 50 }) } }
  );
  const deleteHistory = useDeleteHistory();

  const handleDelete = (animeId: string) => {
    deleteHistory.mutate(
      { animeId: encodeURIComponent(animeId) },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetHistoryQueryKey({}) });
          toast({ title: "Удалено из истории" });
        },
      }
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Сегодня";
    if (diffDays === 1) return "Вчера";
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return d.toLocaleDateString("ru-RU");
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <HistoryIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">История просмотров</h1>
        {data?.total !== undefined && (
          <span className="text-sm text-white/40">{data.total} записей</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-24 text-white/30">
          <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">История просмотров пуста</p>
          <Link href="/" className="text-primary text-sm hover:underline mt-2 block">
            Начать смотреть
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items?.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="group flex gap-3 md:gap-4 items-center bg-card border border-border rounded-xl p-3 md:p-4 hover:border-primary/30 transition-all"
              data-testid={`card-history-${item.id}`}
            >
              {item.animePoster && (
                <img
                  src={item.animePoster}
                  alt={item.animeTitle}
                  className="w-14 rounded-lg object-cover shrink-0"
                  style={{ height: "80px" }}
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm md:text-base truncate">{item.animeTitle}</p>
                <p className="text-xs text-white/50 mt-0.5">Серия {item.episode}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 max-w-48 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, item.progress)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{Math.round(item.progress)}%</span>
                </div>
                <p className="text-xs text-white/30 mt-1.5">{formatDate(item.updatedAt)}</p>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <Link
                  href={`/watch/${encodeURIComponent(item.animeId)}/1/1`}
                  className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
                  data-testid={`button-resume-${item.id}`}
                >
                  <Play className="w-3 h-3" />
                  <span className="hidden sm:inline">Продолжить</span>
                </Link>
                <button
                  onClick={() => handleDelete(item.animeId)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                  data-testid={`button-delete-history-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
