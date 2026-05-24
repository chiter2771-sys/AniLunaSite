import { Link } from "wouter";
import { Star, Plus, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateGenre } from "@/lib/genres";
import { useAddToLibrary } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export interface AnimeCardData {
  id: string;
  title: string;
  poster?: string | null;
  year?: string | null;
  type?: string;
  genres?: string[];
  shikimori_rating?: number | null;
  episodes_count?: number | null;
  status?: string | null;
}

interface AnimeCardProps {
  anime: AnimeCardData;
  className?: string;
}

const TYPE_RU: Record<string, string> = {
  "anime-serial": "Сериал",
  "anime": "Фильм",
  "TV": "Сериал",
  "Movie": "Фильм",
  "OVA": "OVA",
  "ONA": "ONA",
  "Special": "Спешл",
};

export function AnimeCard({ anime, className }: AnimeCardProps) {
  const { toast } = useToast();
  const addToLibrary = useAddToLibrary();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToLibrary.mutate(
      {
        data: {
          animeId: anime.id,
          animeTitle: anime.title,
          animePoster: anime.poster ?? undefined,
          animeType: anime.type ?? "anime",
          status: "plan_to_watch",
        },
      },
      {
        onSuccess: () => toast({ title: "Добавлено в библиотеку" }),
        onError: () => toast({ title: "Ошибка добавления", variant: "destructive" }),
      }
    );
  };

  const typeLabel = TYPE_RU[anime.type ?? ""] ?? anime.type ?? "";

  return (
    <Link href={`/anime/${encodeURIComponent(anime.id)}`} data-testid={`card-anime-${anime.id}`}>
      <div
        className={cn(
          "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
          "hover:scale-105 hover:shadow-2xl hover:shadow-primary/20",
          className
        )}
      >
        <div className="aspect-[2/3] bg-muted relative">
          {anime.poster ? (
            <img
              src={anime.poster}
              alt={anime.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <Play className="w-10 h-10 text-primary/50" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex flex-wrap gap-1 mb-1.5">
              {anime.genres?.slice(0, 2).map((g) => (
                <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-primary/80 text-white font-medium">
                  {translateGenre(g)}
                </span>
              ))}
            </div>
            <button
              onClick={handleQuickAdd}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
              data-testid={`button-add-library-${anime.id}`}
            >
              <Plus className="w-3 h-3" />
              В библиотеку
            </button>
          </div>

          {anime.shikimori_rating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-xs text-yellow-400 font-semibold">
              <Star className="w-3 h-3 fill-yellow-400" />
              {anime.shikimori_rating.toFixed(1)}
            </div>
          )}

          {!!anime.episodes_count && (
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-xs text-white/80">
              {anime.episodes_count} сер.
            </div>
          )}
        </div>

        <div className="p-2">
          <p className="text-sm font-medium text-white truncate">{anime.title}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {!!anime.year && anime.year}{!!anime.year && typeLabel ? " · " : ""}{typeLabel}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-muted" />
      <div className="p-2 space-y-1">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}
