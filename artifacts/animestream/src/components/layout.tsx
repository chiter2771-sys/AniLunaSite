import { Link, useLocation } from "wouter";
import { Search, BookMarked, History, FolderOpen, User, Home, Grid3X3, Menu, X, CalendarDays } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";

const navLinks = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/browse", label: "Каталог", icon: Grid3X3 },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/library", label: "Библиотека", icon: BookMarked },
  { href: "/history", label: "История", icon: History },
  { href: "/collections", label: "Коллекции", icon: FolderOpen },
];

function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const avatarUrl = (profile as { avatar?: string | null } | undefined)?.avatar;
  const userInitial = profile?.username?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/favicon.png" alt="AniLuna" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-lg tracking-tight text-white">AniLuna</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === href
                  ? "text-white bg-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 ml-auto">
          <Link
            href="/search"
            className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            data-testid="link-search"
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link
            href="/profile"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              location === "/profile" ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
            data-testid="link-profile"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userInitial} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                {userInitial}
              </div>
            )}
          </Link>
          <button
            className="md:hidden p-2 rounded-md text-white/60 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-background/98 backdrop-blur-xl">
          <nav className="px-4 py-2 grid grid-cols-3 gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium transition-colors",
                  location === href
                    ? "text-white bg-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search className="w-5 h-5" />
              Поиск
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userInitial} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
              Профиль
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isWatchPage = location.startsWith("/watch/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isWatchPage && <Navbar />}
      <main className={cn(!isWatchPage && "pt-14")}>
        {children}
      </main>
    </div>
  );
}
