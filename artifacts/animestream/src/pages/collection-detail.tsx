import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { FolderOpen, Globe, Lock, Trash2 } from "lucide-react";
import {
  useGetCollection, useRemoveFromCollection,
  getGetCollectionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AnimeCard } from "@/components/anime-card";

export default function CollectionDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = parseInt(rawId ?? "0");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: collection, isLoading } = useGetCollection(id, {
    query: { enabled: !!id, queryKey: getGetCollectionQueryKey(id) },
  });
  const removeFromCollection = useRemoveFromCollection();

  const handleRemove = (animeId: string) => {
    removeFromCollection.mutate(
      { id, animeId: encodeURIComponent(animeId) },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCollectionQueryKey(id) });
          toast({ title: "Удалено из коллекции" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 md:px-8 py-8">
        <div className="h-8 bg-muted rounded w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Коллекция не найдена
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <Link href="/collections" className="text-sm text-white/40 hover:text-white transition-colors mb-3 block">
          ← Коллекции
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{collection.title}</h1>
              {collection.isPublic ? (
                <Globe className="w-4 h-4 text-white/40" />
              ) : (
                <Lock className="w-4 h-4 text-white/40" />
              )}
            </div>
            {collection.description && (
              <p className="text-white/50 text-sm mt-1">{collection.description}</p>
            )}
            <p className="text-white/30 text-xs mt-1">{collection.itemCount} аниме</p>
          </div>
        </div>
      </div>

      {collection.items?.length === 0 ? (
        <div className="text-center py-24 text-white/30">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Коллекция пуста</p>
          <p className="text-sm mt-1">Добавляйте аниме со страниц тайтлов</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
          {collection.items?.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative"
              data-testid={`card-collection-item-${item.id}`}
            >
              <AnimeCard
                anime={{
                  id: item.animeId,
                  title: item.animeTitle,
                  poster: item.animePoster,
                  type: item.animeType,
                }}
              />
              <button
                onClick={() => handleRemove(item.animeId)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                data-testid={`button-remove-item-${item.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
