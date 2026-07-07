"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  duration?: number;
  align?: "left" | "right";
  compact?: boolean;
  /** Auto-start playback when url changes. */
  autoPlay?: boolean;
  /** Called when playback reaches the end. */
  onPlaybackEnd?: () => void;
}

const BAR_COUNT = 40;

function generateBars(duration: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const envelope = 1 - Math.abs((i / (BAR_COUNT - 1)) * 2 - 1);
    bars.push(Math.max(0.08, envelope * (0.3 + Math.random() * 0.7)));
  }
  return bars;
}

export function VoiceMessageBubble({ url, duration: estDuration, align = "left", compact, autoPlay, onPlaybackEnd }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(estDuration ?? 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = useRef<number[]>(generateBars(estDuration ?? 5));
  const rafRef = useRef(0);
  const autoPlayedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    autoPlayedRef.current = false;
    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
      onPlaybackEnd?.();
    };
    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.pause();
      audio.src = "";
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoPlay && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setPlaying(true);
        const tick = () => {
          if (!audioRef.current) return;
          setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    }
  }, [autoPlay]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      setPlaying(true);
      const tick = () => {
        if (!audioRef.current) return;
        setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const activeBar = Math.floor(progress * BAR_COUNT);

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "h-10" : "h-14",
    )}>
      <button
        onClick={toggle}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full transition-colors",
          compact ? "h-8 w-8" : "h-10 w-10",
          align === "right"
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-koda-accent/15 text-koda-accent hover:bg-koda-accent/25"
        )}
      >
        {playing ? (
          <Pause className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        ) : (
          <Play className={compact ? "h-3.5 w-3.5 ml-0.5" : "h-4 w-4 ml-0.5"} />
        )}
      </button>

      <div className={cn("flex flex-1 items-center gap-1", compact ? "h-8" : "h-10")}>
        {bars.current.map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-all",
              compact ? "" : "min-h-[4px]",
              i <= activeBar && playing
                ? align === "right" ? "bg-white" : "bg-koda-accent"
                : align === "right" ? "bg-white/30" : "bg-koda-text/20"
            )}
            style={{
              height: compact
                ? `${Math.max(4, h * 24)}px`
                : `${Math.max(4, h * 36)}px`,
            }}
          />
        ))}
      </div>

      <span className={cn(
        "shrink-0 tabular-nums",
        compact ? "text-[10px]" : "text-xs",
        align === "right" ? "text-white/70" : "text-koda-muted"
      )}>
        {fmt(playing ? progress * duration : duration)}
      </span>
    </div>
  );
}

export function VoiceBubbleSkeleton({ align = "left" }: { align?: "left" | "right" }) {
  return (
    <div className="flex h-14 items-center gap-2">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        align === "right" ? "bg-white/10" : "bg-koda-accent/10"
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-koda-muted" />
      </div>
      <div className="flex flex-1 items-center gap-1 animate-pulse">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-koda-text/10"
            style={{ height: `${Math.max(4, (0.15 + Math.random() * 0.85) * 36)}px` }}
          />
        ))}
      </div>
      <span className="w-8 shrink-0 text-xs text-koda-muted">0:00</span>
    </div>
  );
}
