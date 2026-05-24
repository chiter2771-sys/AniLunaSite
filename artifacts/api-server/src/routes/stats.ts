import { Router } from "express";
import { db, watchHistoryTable, libraryTable, ratingsTable, commentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "../lib/session";

const router = Router();

const ACHIEVEMENTS = [
  { id: "first_watch", title: "Первые шаги", description: "Посмотрите первую серию", icon: "play", maxProgress: 1 },
  { id: "episodes_10", title: "Затягивает", description: "Посмотрите 10 серий", icon: "tv", maxProgress: 10 },
  { id: "episodes_50", title: "Марафонец", description: "Посмотрите 50 серий", icon: "zap", maxProgress: 50 },
  { id: "episodes_100", title: "Настоящий фанат", description: "Посмотрите 100 серий", icon: "star", maxProgress: 100 },
  { id: "episodes_500", title: "Истинный отаку", description: "Посмотрите 500 серий", icon: "crown", maxProgress: 500 },
  { id: "first_rate", title: "Критик", description: "Оцените своё первое аниме", icon: "thumbs-up", maxProgress: 1 },
  { id: "rates_10", title: "Рецензент", description: "Оцените 10 аниме", icon: "bar-chart", maxProgress: 10 },
  { id: "first_comment", title: "Голос сообщества", description: "Оставьте первый комментарий", icon: "message-square", maxProgress: 1 },
  { id: "comments_10", title: "Активный участник", description: "Оставьте 10 комментариев", icon: "message-circle", maxProgress: 10 },
  { id: "first_complete", title: "Завершитель", description: "Завершите просмотр первого аниме", icon: "check-circle", maxProgress: 1 },
  { id: "complete_5", title: "Коллекционер финалов", description: "Завершите просмотр 5 аниме", icon: "trophy", maxProgress: 5 },
  { id: "library_10", title: "Собиратель", description: "Добавьте 10 аниме в библиотеку", icon: "bookmark", maxProgress: 10 },
  { id: "first_collection", title: "Куратор", description: "Создайте первую коллекцию", icon: "folder", maxProgress: 1 },
  { id: "level_5", title: "Восходящая звезда", description: "Достигните 5 уровня", icon: "trending-up", maxProgress: 5 },
  { id: "level_10", title: "Ветеран", description: "Достигните 10 уровня", icon: "award", maxProgress: 10 },
];

const LEVEL_XP_THRESHOLD = 1000;

router.get("/stats", async (req, res): Promise<void> => {
  const userId = await getOrCreateUser(req);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const history = await db.select().from(watchHistoryTable).where(eq(watchHistoryTable.userId, userId));
  const library = await db.select().from(libraryTable).where(eq(libraryTable.userId, userId));
  const ratings = await db.select().from(ratingsTable).where(eq(ratingsTable.userId, userId));
  const comments = await db.select().from(commentsTable).where(eq(commentsTable.userId, userId));

  const episodesWatched = history.reduce((sum, h) => sum + (h.progress >= 80 ? 1 : 0), 0);
  const minutesWatched = Math.floor(history.reduce((sum, h) => sum + (h.duration / 60), 0));
  const animeCompleted = library.filter((l) => l.status === "completed").length;
  const animeWatching = library.filter((l) => l.status === "watching").length;
  const animePlanToWatch = library.filter((l) => l.status === "plan_to_watch").length;
  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings : null;
  const totalComments = comments.length;

  const level = user?.level ?? 1;
  const xp = user?.xp ?? 0;
  const xpToNextLevel = LEVEL_XP_THRESHOLD - (xp % LEVEL_XP_THRESHOLD);

  const genreMap = new Map<string, number>();
  for (const entry of library) {
    // just log anime types as a proxy for genres
  }
  const recentGenres: string[] = [];

  const achievementList = ACHIEVEMENTS.map((a) => {
    let progress = 0;
    let unlocked = false;

    switch (a.id) {
      case "first_watch": progress = Math.min(1, history.length); break;
      case "episodes_10": progress = Math.min(10, episodesWatched); break;
      case "episodes_50": progress = Math.min(50, episodesWatched); break;
      case "episodes_100": progress = Math.min(100, episodesWatched); break;
      case "episodes_500": progress = Math.min(500, episodesWatched); break;
      case "first_rate": progress = Math.min(1, totalRatings); break;
      case "rates_10": progress = Math.min(10, totalRatings); break;
      case "first_comment": progress = Math.min(1, totalComments); break;
      case "comments_10": progress = Math.min(10, totalComments); break;
      case "first_complete": progress = Math.min(1, animeCompleted); break;
      case "complete_5": progress = Math.min(5, animeCompleted); break;
      case "library_10": progress = Math.min(10, library.length); break;
      case "level_5": progress = Math.min(5, level); break;
      case "level_10": progress = Math.min(10, level); break;
      default: progress = 0;
    }

    unlocked = progress >= a.maxProgress;

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      unlocked,
      earnedAt: unlocked ? new Date().toISOString() : null,
      progress,
      maxProgress: a.maxProgress,
    };
  });

  res.json({
    episodesWatched,
    minutesWatched,
    animeCompleted,
    animeWatching,
    animePlanToWatch,
    averageRating,
    totalRatings,
    totalComments,
    level,
    xp,
    xpToNextLevel,
    achievements: achievementList,
    recentGenres,
  });
});

export default router;
