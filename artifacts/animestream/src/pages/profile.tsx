import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Star, MessageSquare, Trophy, Clock, BookMarked,
  Edit2, Check, X, Camera, Upload, LogOut, Calendar,
} from "lucide-react";
import {
  useGetProfile, useGetUserStats, useUpdateProfile,
  getGetProfileQueryKey, getGetUserStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  play: () => <span>▶</span>,
  tv: () => <span>TV</span>,
  zap: () => <span>⚡</span>,
  star: Star,
  crown: () => <span>♛</span>,
  "thumbs-up": () => <span>👍</span>,
  "bar-chart": () => <span>📊</span>,
  "message-square": MessageSquare,
  "message-circle": MessageSquare,
  "check-circle": Check,
  trophy: Trophy,
  bookmark: BookMarked,
  folder: () => <span>📁</span>,
  "trending-up": () => <span>↗</span>,
  award: Trophy,
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageUploadButton({
  onUpload,
  className,
  children,
}: {
  onUpload: (dataUrl: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) return;
          const b64 = await fileToBase64(file);
          onUpload(b64);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={className}
      >
        {children}
      </button>
    </>
  );
}

export default function Profile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const { data: stats, isLoading: statsLoading } = useGetUserStats({
    query: { queryKey: getGetUserStatsQueryKey() },
  });
  const updateProfile = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);

  const startEdit = () => {
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setPendingAvatar(null);
    setPendingBanner(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPendingAvatar(null);
    setPendingBanner(null);
  };

  const saveEdit = () => {
    const data: Record<string, string> = {};
    if (username) data.username = username;
    if (bio !== undefined) data.bio = bio;
    if (pendingAvatar) data.avatar = pendingAvatar;
    if (pendingBanner) data.banner = pendingBanner;

    updateProfile.mutate(
      { data },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Профиль обновлён!" });
          setEditing(false);
          setPendingAvatar(null);
          setPendingBanner(null);
        },
        onError: () => toast({ title: "Ошибка обновления профиля", variant: "destructive" }),
      }
    );
  };

  const xp = stats?.xp ?? profile?.xp ?? 0;
  const level = stats?.level ?? profile?.level ?? 1;
  const xpToNext = stats?.xpToNextLevel ?? (1000 - (xp % 1000));
  const xpProgress = (xp % 1000) / 10;

  const displayAvatar = pendingAvatar ?? profile?.avatar;
  const displayBanner = pendingBanner ?? (profile as { banner?: string | null } | undefined)?.banner;
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("ru-RU", { year: "numeric", month: "long" })
    : null;

  if (profileLoading) {
    return (
      <div className="min-h-screen">
        <div className="h-48 bg-muted animate-pulse" />
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 -mt-10">
          <div className="w-24 h-24 rounded-2xl bg-muted animate-pulse border-4 border-background" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-br from-primary/30 via-secondary/20 to-background">
        {displayBanner ? (
          <img
            src={displayBanner}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-purple-900/30 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {editing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <ImageUploadButton
              onUpload={setPendingBanner}
              className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Изменить баннер</span>
            </ImageUploadButton>
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 md:-mt-14 mb-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-background overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-4xl font-bold">
                  {profile?.username?.[0]?.toUpperCase() ?? "A"}
                </span>
              )}
            </div>
            {/* Level badge */}
            <div className="absolute -bottom-2 -right-2 min-w-[28px] h-7 px-1.5 rounded-full bg-primary border-2 border-background flex items-center justify-center text-xs font-bold text-white shadow-lg">
              {level}
            </div>
            {/* Avatar upload button when editing */}
            {editing && (
              <ImageUploadButton
                onUpload={setPendingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center border-4 border-background opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </ImageUploadButton>
            )}
          </div>

          {/* Name + XP */}
          <div className="flex-1 min-w-0 pb-1">
            <AnimatePresence mode="wait">
              {editing ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-2"
                >
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full max-w-xs px-3 py-1.5 rounded-lg bg-card border border-border text-white text-sm focus:outline-none focus:border-primary/60"
                    placeholder="Имя пользователя"
                    data-testid="input-username"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    className="w-full max-w-sm px-3 py-1.5 rounded-lg bg-card border border-border text-white text-sm resize-none focus:outline-none focus:border-primary/60"
                    placeholder="О себе (необязательно)"
                    data-testid="input-bio"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={saveEdit}
                      disabled={updateProfile.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50"
                      data-testid="button-save-profile"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {updateProfile.isPending ? "Сохранение..." : "Сохранить"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-colors"
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-3.5 h-3.5" /> Отмена
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{profile?.username ?? "..."}</h1>
                    <button
                      onClick={startEdit}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      data-testid="button-edit-profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {profile?.bio && (
                    <p className="text-white/55 text-sm mt-1 max-w-lg">{profile.bio}</p>
                  )}
                  {joinDate && (
                    <p className="flex items-center gap-1.5 text-xs text-white/35 mt-1.5">
                      <Calendar className="w-3 h-3" />
                      На сайте с {joinDate}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-2 shrink-0 sm:self-end pb-1">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Редактировать
              </button>
            </div>
          )}
        </div>

        {/* XP bar */}
        <div className="mb-8 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-white">Уровень {level}</span>
            </div>
            <span className="text-xs text-white/45">{xp} XP · до следующего {xpToNext} XP</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Серий просмотрено", value: stats?.episodesWatched ?? 0, icon: Clock, color: "from-blue-500/20 to-blue-600/10" },
            { label: "Завершено тайтлов", value: stats?.animeCompleted ?? 0, icon: Trophy, color: "from-yellow-500/20 to-yellow-600/10" },
            { label: "Оценок выставлено", value: stats?.totalRatings ?? 0, icon: Star, color: "from-orange-500/20 to-orange-600/10" },
            { label: "Комментариев", value: stats?.totalComments ?? 0, icon: MessageSquare, color: "from-green-500/20 to-green-600/10" },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn("bg-gradient-to-br border border-border rounded-2xl p-4", color)}
            >
              <Icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-bold text-white">{value.toLocaleString("ru-RU")}</div>
              <div className="text-xs text-white/50 mt-0.5">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Achievements */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Достижения
            {stats?.achievements && (
              <span className="text-sm font-normal text-white/40 ml-1">
                {stats.achievements.filter((a) => a.unlocked).length}/{stats.achievements.length}
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {statsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
                ))
              : stats?.achievements?.map((achievement) => {
                  const Icon = ICON_MAP[achievement.icon] ?? Trophy;
                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "flex gap-3 items-center p-4 rounded-2xl border transition-all",
                        achievement.unlocked
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.08)]"
                          : "bg-card border-border opacity-55"
                      )}
                      data-testid={`achievement-${achievement.id}`}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        achievement.unlocked ? "bg-primary/20" : "bg-white/5"
                      )}>
                        <Icon className={cn("w-5 h-5", achievement.unlocked ? "text-primary" : "text-white/30")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{achievement.title}</p>
                        <p className="text-xs text-white/50 truncate">{achievement.description}</p>
                        {!achievement.unlocked && (achievement.maxProgress ?? 0) > 1 && (
                          <div className="mt-1.5 h-1 rounded-full bg-white/10">
                            <div
                              className="h-1 rounded-full bg-primary/50"
                              style={{ width: `${((achievement.progress ?? 0) / (achievement.maxProgress ?? 1)) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {achievement.unlocked && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
