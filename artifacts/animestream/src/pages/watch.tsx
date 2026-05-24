import { useParams, useLocation, Link } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack,
  Settings, List, ArrowLeft, PictureInPicture2, ChevronDown, Mic2,
} from "lucide-react";
import {
  useGetAnimeStream, useGetAnimeEpisodes, useGetAnime, useSaveProgress,
  getGetAnimeStreamQueryKey, getGetAnimeEpisodesQueryKey, getGetAnimeQueryKey,
} from "@workspace/api-client-react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Watch() {
  const { kodikId: rawId, episode: rawEp, translationId: rawTrans } = useParams<{
    kodikId: string; episode: string; translationId: string;
  }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const kodikId = decodeURIComponent(rawId ?? "");
  const parsedEpisode = Number.parseInt(rawEp ?? "1", 10);
  const parsedTranslationId = Number.parseInt(rawTrans ?? "1", 10);
  const episode = Number.isFinite(parsedEpisode) && parsedEpisode > 0 ? parsedEpisode : 1;
  const translationId = Number.isFinite(parsedTranslationId) && parsedTranslationId > 0 ? parsedTranslationId : 1;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveProgressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedAtRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [showQualityPicker, setShowQualityPicker] = useState(false);
  const [selectedQualityUrl, setSelectedQualityUrl] = useState<string | null>(null);

  const { data: stream, isLoading: streamLoading } = useGetAnimeStream(
    kodikId, episode, translationId,
    { query: { queryKey: getGetAnimeStreamQueryKey(kodikId, episode, translationId) } }
  );

  const streamType = (stream as { type?: string } | undefined)?.type ?? "iframe";
  const isIframePlayer = !!(stream?.url && (streamType === "iframe" || stream.url.includes("kodik")));
  const { data: episodes } = useGetAnimeEpisodes(kodikId, {
    query: { queryKey: getGetAnimeEpisodesQueryKey(kodikId) },
  });
  const { data: anime } = useGetAnime(kodikId, {
    query: { queryKey: getGetAnimeQueryKey(kodikId) },
  });
  const saveProgress = useSaveProgress();

  const episodeList = episodes?.episodes ?? [];
  const translationList = (episodes as { translations?: Array<{ id: number; title: string; type: string }> } | undefined)?.translations ?? [];
  const currentEpIdx = episodeList.findIndex((e) => e.number === episode);
  const nextEp = episodeList[currentEpIdx + 1];
  const prevEp = episodeList[currentEpIdx - 1];

  const streamQualities = (stream as { qualities?: Array<{ label: string; url: string }> } | undefined)?.qualities ?? [];
  const activeQualityUrl = selectedQualityUrl ?? stream?.url ?? "";

  // Reset quality when stream changes
  useEffect(() => {
    setSelectedQualityUrl(null);
  }, [stream?.url]);

  // HLS setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeQualityUrl || isIframePlayer) return;

    setBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = activeQualityUrl;

    if (url.includes(".m3u8") || streamType === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({ startLevel: -1 });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            toast({ title: "Ошибка воспроизведения", description: "Не удалось загрузить поток", variant: "destructive" });
            setBuffering(false);
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.play().catch(() => {});
      } else {
        toast({ title: "Поток не поддерживается", variant: "destructive" });
        setBuffering(false);
      }
    } else if (!isIframePlayer) {
      video.src = url;
      video.play().catch(() => {});
    }

    // Restore saved position
    const saved = localStorage.getItem(`watch-progress-${kodikId}-${episode}`);
    if (saved) {
      const pos = parseFloat(saved);
      if (!isNaN(pos) && pos > 10) {
        video.currentTime = pos;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeQualityUrl, kodikId, episode, isIframePlayer, streamType, toast]);

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      const t = video.currentTime;
      currentTimeRef.current = t;
      setCurrentTime(t);
      localStorage.setItem(`watch-progress-${kodikId}-${episode}`, String(t));
    };
    const onDurationChange = () => {
      durationRef.current = video.duration;
      setDuration(video.duration);
    };
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => { setPlaying(false); setShowNextEpisode(true); };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
    };
  }, [kodikId, episode]);

  // Skip intro detection (60-90s)
  useEffect(() => {
    setShowSkipIntro(currentTime >= 60 && currentTime <= 90);
  }, [currentTime]);

  // Next episode countdown (last 30s)
  useEffect(() => {
    if (duration > 0 && nextEp && duration - currentTime <= 30) {
      setShowNextEpisode(true);
    }
  }, [currentTime, duration, nextEp]);

  // Save progress to API every 30s using refs to avoid stale closure
  const persistProgress = useCallback(() => {
    if (!anime || durationRef.current === 0 || currentTimeRef.current < 5) return;
    const now = Date.now();
    if (now - lastSavedAtRef.current < 10_000) return;
    lastSavedAtRef.current = now;
    saveProgress.mutate({
      data: {
        animeId: kodikId,
        animeTitle: anime.title,
        animePoster: anime.poster ?? undefined,
        episode,
        position: currentTimeRef.current,
        duration: durationRef.current,
      },
    });
  }, [anime, saveProgress, kodikId, episode]);

  useEffect(() => {
    if (!anime || !playing || durationRef.current === 0) return;

    saveProgressInterval.current = setInterval(() => {
      persistProgress();
    }, 15000);

    return () => {
      if (saveProgressInterval.current) clearInterval(saveProgressInterval.current);
    };
  }, [playing, anime, persistProgress]);

  useEffect(() => {
    const onBeforeUnload = () => persistProgress();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      persistProgress();
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [persistProgress]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); video.paused ? video.play() : video.pause(); break;
        case "f": toggleFullscreen(); break;
        case "m": toggleMute(); break;
        case "ArrowLeft": video.currentTime = Math.max(0, video.currentTime - 10); break;
        case "ArrowRight": video.currentTime = Math.min(durationRef.current, video.currentTime + 10); break;
        case "ArrowUp": e.preventDefault(); setVolume((v) => { const nv = Math.min(1, v + 0.1); video.volume = nv; return nv; }); break;
        case "ArrowDown": e.preventDefault(); setVolume((v) => { const nv = Math.max(0, v - 0.1); video.volume = nv; return nv; }); break;
        case "n": if (nextEp) goNextEpisode(); break;
        case "Escape": setShowSidebar(false); setShowTranslationPicker(false); setShowQualityPicker(false); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextEp]);

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (saveProgressInterval.current) clearInterval(saveProgressInterval.current);
    };
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  }, [playing]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * duration;
  };

  const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setSeekPreview(ratio * duration);
  };

  const goNextEpisode = () => {
    if (!nextEp) return;
    setLocation(`/watch/${encodeURIComponent(kodikId)}/${nextEp.number}/${translationId}`);
  };

  const goPrevEpisode = () => {
    if (!prevEp) return;
    setLocation(`/watch/${encodeURIComponent(kodikId)}/${prevEp.number}/${translationId}`);
  };

  // Bug fix: skip to 90s (end of intro window), not 90+60=150s
  const skipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, 90);
    setShowSkipIntro(false);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black flex flex-col select-none"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => playing && setShowControls(false)}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      {/* Ambient background */}
      {anime?.poster && (
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${anime.poster})`, filter: "blur(40px) saturate(2)" }}
        />
      )}

      {/* Player: iframe for Kodik, video for HLS */}
      {isIframePlayer ? (
        stream?.url && (
          <iframe
            key={stream.url}
            src={stream.url}
            className="absolute inset-0 w-full h-full z-10"
            allowFullScreen
            allow="autoplay; fullscreen"
            frameBorder="0"
            scrolling="no"
          />
        )
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain z-10"
          playsInline
          onClick={togglePlay}
        />
      )}

      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}

      {/* Skip intro */}
      {showSkipIntro && (
        <div className={cn("absolute bottom-24 right-8 z-30 transition-all", showControls ? "opacity-100" : "opacity-0")}>
          <button
            onClick={skipIntro}
            className="px-5 py-2.5 rounded-lg border border-white/30 bg-black/70 backdrop-blur text-white text-sm font-medium hover:bg-white/20 transition-colors"
            data-testid="button-skip-intro"
          >
            Пропустить заставку
          </button>
        </div>
      )}

      {/* Next episode card */}
      {showNextEpisode && nextEp && (
        <div className="absolute bottom-24 right-8 z-30">
          <div className="flex flex-col gap-2 bg-card/95 backdrop-blur border border-border rounded-xl p-4 w-56 shadow-2xl">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Далее</p>
            <p className="text-sm font-semibold text-white">Серия {nextEp.number}</p>
            <button
              onClick={goNextEpisode}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-colors"
              data-testid="button-next-episode-overlay"
            >
              <Play className="w-3 h-3 fill-white" />
              Следующая
            </button>
          </div>
        </div>
      )}

      {/* Episode sidebar */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-72 bg-card/95 backdrop-blur border-l border-border z-30 transition-transform",
          showSidebar ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border">
          <p className="font-semibold text-white">{anime?.title}</p>
          <p className="text-xs text-white/50 mt-0.5">{episodeList.length} серий</p>
        </div>
        <div className="overflow-y-auto h-full pb-16">
          {episodeList.map((ep) => (
            <Link
              key={ep.number}
              href={`/watch/${encodeURIComponent(kodikId)}/${ep.number}/${translationId}`}
              onClick={() => setShowSidebar(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors",
                ep.number === episode && "bg-primary/20 text-primary"
              )}
              data-testid={`sidebar-episode-${ep.number}`}
            >
              <span className={cn("text-sm font-medium", ep.number === episode ? "text-primary" : "text-white/70")}>
                Сер. {ep.number}
              </span>
              {ep.number === episode && <span className="ml-auto text-xs text-primary">Играет</span>}
            </Link>
          ))}
        </div>
      </div>
      {showSidebar && <button className="absolute inset-0 z-20" onClick={() => setShowSidebar(false)} aria-label="Закрыть список серий" />}

      {/* Controls overlay — simplified for iframe, full for HLS */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex flex-col transition-opacity pointer-events-none",
          isIframePlayer ? "opacity-100" : (showControls ? "opacity-100" : "opacity-0")
        )}
      >
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
          <Link
            href={`/anime/${encodeURIComponent(kodikId)}`}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{anime?.title}</p>
            <p className="text-xs text-white/50">Серия {episode}</p>
          </div>

          {/* Translation picker button */}
          {translationList.length > 1 && (
            <div className="relative">
              <button
                onClick={() => { setShowTranslationPicker(!showTranslationPicker); setShowQualityPicker(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-colors"
                data-testid="button-translation-picker"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span className="max-w-[80px] truncate">{(stream as { translation?: { title?: string } } | undefined)?.translation?.title ?? "Озвучка"}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showTranslationPicker && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-card/95 backdrop-blur border border-border rounded-xl py-1 shadow-2xl z-50">
                  {translationList.map((t) => (
                    <Link
                      key={t.id}
                      href={`/watch/${encodeURIComponent(kodikId)}/${episode}/${t.id}`}
                      onClick={() => setShowTranslationPicker(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors",
                        t.id === translationId ? "text-primary font-medium" : "text-white/70"
                      )}
                    >
                      <Mic2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.title}</span>
                      <span className="ml-auto text-white/30 text-[10px] capitalize">{t.type}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quality picker button (HLS only) */}
          {!isIframePlayer && streamQualities.length > 1 && (
            <div className="relative">
              <button
                onClick={() => { setShowQualityPicker(!showQualityPicker); setShowTranslationPicker(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-colors"
                data-testid="button-quality-picker"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{streamQualities.find((q) => q.url === activeQualityUrl)?.label ?? streamQualities[0]?.label ?? "Качество"}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showQualityPicker && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-card/95 backdrop-blur border border-border rounded-xl py-1 shadow-2xl z-50">
                  {streamQualities.map((q) => (
                    <button
                      key={q.url}
                      onClick={() => { setSelectedQualityUrl(q.url); setShowQualityPicker(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors",
                        q.url === activeQualityUrl ? "text-primary font-medium" : "text-white/70"
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            data-testid="button-toggle-sidebar"
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        {/* Center play area — hidden for iframe */}
        <div
          className={cn("flex-1 flex items-center justify-center gap-8 pointer-events-auto cursor-pointer", isIframePlayer && "pointer-events-none opacity-0")}
          onClick={!isIframePlayer ? togglePlay : undefined}
        >
          <button
            onClick={(e) => { e.stopPropagation(); goPrevEpisode(); }}
            disabled={!prevEp}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
            data-testid="button-prev-episode"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <div className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            {playing ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white fill-white" />}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goNextEpisode(); }}
            disabled={!nextEp}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
            data-testid="button-next-episode"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom controls — hidden for iframe */}
        <div className={cn("px-4 pb-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto", isIframePlayer && "hidden")}>
          {/* Progress bar */}
          <div
            className="relative h-1 rounded-full bg-white/20 cursor-pointer mb-4 group"
            onClick={handleSeek}
            onMouseMove={handleSeekHover}
            onMouseLeave={() => setSeekPreview(null)}
            data-testid="seek-bar"
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
            />
            {seekPreview !== null && (
              <div
                className="absolute -top-8 text-xs bg-black/80 px-2 py-0.5 rounded text-white pointer-events-none"
                style={{ left: `${(seekPreview / (duration || 1)) * 100}%`, transform: "translateX(-50%)" }}
              >
                {formatTime(seekPreview)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors" data-testid="button-play-pause">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <div className="flex items-center gap-2 group">
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors" data-testid="button-mute">
                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-200">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) videoRef.current.volume = v;
                    if (v > 0) setMuted(false);
                  }}
                  className="w-20 accent-primary"
                  data-testid="volume-slider"
                />
              </div>
            </div>

            <span className="text-xs text-white/60 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={async () => {
                  if (videoRef.current) {
                    if (document.pictureInPictureElement) {
                      await document.exitPictureInPicture();
                    } else {
                      await videoRef.current.requestPictureInPicture();
                    }
                  }
                }}
                className="text-white/70 hover:text-white transition-colors hidden md:block"
                data-testid="button-pip"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </button>
              <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors" data-testid="button-fullscreen">
                {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {streamLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-white/60 text-sm">Загрузка...</p>
        </div>
      )}

      {!streamLoading && !stream?.url && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 gap-3 px-4 text-center">
          <p className="text-white font-semibold">Поток недоступен</p>
          <p className="text-white/60 text-sm">Попробуйте выбрать другую озвучку или эпизод.</p>
        </div>
      )}
    </div>
  );
}
