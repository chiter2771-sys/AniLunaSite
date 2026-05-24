import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Lock, Globe, Trash2 } from "lucide-react";
import {
  useGetCollections, useCreateCollection, useDeleteCollection,
  getGetCollectionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Collections() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: collections, isLoading } = useGetCollections({
    query: { queryKey: getGetCollectionsQueryKey() },
  });
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createCollection.mutate(
      { data: { title: title.trim(), description: description.trim() || undefined, isPublic } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCollectionsQueryKey() });
          toast({ title: "Коллекция создана" });
          setTitle("");
          setDescription("");
          setIsPublic(false);
          setShowCreate(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteCollection.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCollectionsQueryKey() });
          toast({ title: "Коллекция удалена" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Коллекции</h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-colors"
          data-testid="button-create-collection"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Новая коллекция</span>
          <span className="sm:hidden">Создать</span>
        </button>
      </div>

      {showCreate && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="bg-card border border-border rounded-xl p-5 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Новая коллекция</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Название *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название коллекции"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white text-sm focus:outline-none focus:border-primary/60"
                data-testid="input-collection-title"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="О чём эта коллекция?"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white text-sm resize-none focus:outline-none focus:border-primary/60"
                data-testid="input-collection-desc"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-primary"
                data-testid="checkbox-is-public"
              />
              <label htmlFor="isPublic" className="text-sm text-white/60">Сделать публичной</label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!title.trim() || createCollection.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors"
                data-testid="button-submit-collection"
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </motion.form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !collections || collections.length === 0 ? (
        <div className="text-center py-24 text-white/30">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Коллекций пока нет</p>
          <p className="text-sm mt-1">Создайте первую коллекцию для организации аниме</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {collections.map((col) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative"
              data-testid={`card-collection-${col.id}`}
            >
              <Link href={`/collections/${col.id}`}>
                <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer">
                  <div className="h-32 relative bg-gradient-to-br from-primary/20 to-secondary/20">
                    {col.coverPoster && (
                      <img
                        src={col.coverPoster}
                        alt={col.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                    <div className="absolute top-3 right-3">
                      {col.isPublic ? (
                        <Globe className="w-4 h-4 text-white/50" />
                      ) : (
                        <Lock className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-white truncate">{col.title}</p>
                    {col.description && <p className="text-xs text-white/50 mt-0.5 truncate">{col.description}</p>}
                    <p className="text-xs text-white/30 mt-2">{col.itemCount} аниме</p>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(col.id)}
                className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                data-testid={`button-delete-collection-${col.id}`}
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
