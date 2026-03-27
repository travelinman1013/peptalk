"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { ClipResult, BrowseClip, getVideoUrl } from "@/lib/api";
import { getClipTitle } from "@/lib/clip-labels";
import { useAirPlay } from "@/lib/hooks/use-airplay";

interface JulianPlayerProps {
  clips: (ClipResult | BrowseClip)[];
  onExit: () => void;
}

export function JulianPlayer({ clips, onExit }: JulianPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [disconnectToast, setDisconnectToast] = useState(false);
  const exitConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { airplayAvailable, airplayActive, showAirPlayPicker, airplayError } =
    useAirPlay(videoRef);

  // Keep ref in sync
  currentIndexRef.current = currentIndex;

  const currentClip = clips[currentIndex];
  const nextClip = currentIndex < clips.length - 1 ? clips[currentIndex + 1] : null;

  // Triple-tap to exit (hidden gesture for Sam)
  const requestExit = useCallback(() => {
    if (airplayActive) {
      setShowExitConfirm(true);
      exitConfirmTimerRef.current = setTimeout(() => {
        setShowExitConfirm(false);
      }, 3000);
    } else {
      onExit();
    }
  }, [airplayActive, onExit]);

  const confirmExit = useCallback(() => {
    if (exitConfirmTimerRef.current) clearTimeout(exitConfirmTimerRef.current);
    setShowExitConfirm(false);
    onExit();
  }, [onExit]);

  const cancelExit = useCallback(() => {
    if (exitConfirmTimerRef.current) clearTimeout(exitConfirmTimerRef.current);
    setShowExitConfirm(false);
  }, []);

  const handleTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      requestExit();
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 500);
  }, [requestExit]);

  // Initial play
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (exitConfirmTimerRef.current) clearTimeout(exitConfirmTimerRef.current);
    };
  }, []);

  // Preload next clip via fetch (hidden <video preload> is no-op on iOS Safari)
  useEffect(() => {
    if (nextClip) {
      fetch(getVideoUrl(nextClip.scene_id)).catch(() => {});
    }
  }, [nextClip?.scene_id]);

  // Handle AirPlay disconnect — resume local playback
  const prevAirplayActive = useRef(airplayActive);
  useEffect(() => {
    if (prevAirplayActive.current && !airplayActive) {
      // AirPlay just disconnected
      setExpanded(false);
      setDisconnectToast(true);
      setTimeout(() => setDisconnectToast(false), 3000);
      // Resume local playback
      const video = videoRef.current;
      if (video) video.play().catch(() => {});
    }
    prevAirplayActive.current = airplayActive;
  }, [airplayActive]);

  const handleEnded = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx < clips.length - 1) {
      const nextIdx = idx + 1;
      // Synchronous src change — preserves AirPlay session and autoplay gesture chain
      setTransitioning(true);
      const video = videoRef.current;
      if (video) {
        video.src = getVideoUrl(clips[nextIdx].scene_id);
        video.play().catch(() => {});
      }
      setCurrentIndex(nextIdx);
      setTimeout(() => setTransitioning(false), 500);
    } else {
      // Last clip — exit after delay
      setTimeout(onExit, 2000);
    }
  }, [clips, onExit]);

  const handleSkip = useCallback(() => {
    handleEnded();
  }, [handleEnded]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }, []);

  // Single-tap exit button
  const handleExitTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      requestExit();
    },
    [requestExit]
  );

  // Handle video error — skip to next or exit
  const handleError = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx < clips.length - 1) {
      const nextIdx = idx + 1;
      const video = videoRef.current;
      if (video) {
        video.src = getVideoUrl(clips[nextIdx].scene_id);
        video.play().catch(() => {});
      }
      setCurrentIndex(nextIdx);
    } else {
      setTimeout(onExit, 1000);
    }
  }, [clips, onExit]);

  const clipTitle = getClipTitle(currentClip);

  // ── Mini-bar mode (AirPlay active, not expanded) ──
  if (airplayActive && !expanded) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 shadow-2xl"
        onClick={handleTap}
      >
        {/* Hidden video element — drives AirPlay */}
        <video
          ref={videoRef}
          src={getVideoUrl(currentClip.scene_id)}
          className="sr-only"
          playsInline
          autoPlay
          onEnded={handleEnded}
          onError={handleError}
        />

        <div className="mx-auto flex max-w-lg items-center gap-3">
          {/* AirPlay indicator */}
          <button
            onClick={(e) => { e.stopPropagation(); showAirPlayPicker(); }}
            className="flex-none text-blue-400"
            aria-label="AirPlay settings"
          >
            <AirPlayIcon size={20} />
          </button>

          {/* Clip info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{clipTitle}</p>
            <p className="text-xs text-muted-foreground">
              Playing on TV{clips.length > 1 ? ` · ${currentIndex + 1}/${clips.length}` : ""}
            </p>
          </div>

          {/* Transport controls */}
          <button
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            className="flex-none rounded-full p-2 text-foreground transition-colors hover:bg-muted"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
          </button>

          {clips.length > 1 && currentIndex < clips.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSkip(); }}
              className="flex-none rounded-full p-2 text-foreground transition-colors hover:bg-muted"
              aria-label="Next clip"
            >
              <SkipIcon size={20} />
            </button>
          )}

          {/* Expand to fullscreen controller */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="flex-none rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Expand player"
          >
            <ExpandIcon size={16} />
          </button>
        </div>

        {/* Exit confirm overlay */}
        {showExitConfirm && (
          <ExitConfirmDialog onConfirm={confirmExit} onCancel={cancelExit} />
        )}
      </div>
    );
  }

  // ── Fullscreen mode (local playback OR expanded AirPlay controller) ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={handleTap}
      role="dialog"
      aria-label={
        airplayActive
          ? `Playing on TV: ${clipTitle}. Triple-tap or tap X to exit.`
          : `Playing clip for Julian. Triple-tap or tap X to exit.`
      }
    >
      {/* Video — visible for local, hidden for AirPlay controller */}
      <div
        className={`h-full w-full transition-opacity duration-500 ${
          transitioning ? "opacity-0" : "opacity-100"
        } ${airplayActive ? "sr-only" : "animate-fade-in"}`}
      >
        <video
          ref={videoRef}
          src={getVideoUrl(currentClip.scene_id)}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          onEnded={handleEnded}
          onError={handleError}
          aria-label={clipTitle}
        />
      </div>

      {/* AirPlay controller overlay (when casting + expanded) */}
      {airplayActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
          <AirPlayIcon size={48} className="text-blue-400" />
          <div className="text-center">
            <p className="text-lg font-medium text-white">Playing on TV</p>
            <p className="mt-1 text-sm text-white/60">{clipTitle}</p>
            {clips.length > 1 && (
              <p className="mt-0.5 text-xs text-white/40">
                {currentIndex + 1} of {clips.length}
              </p>
            )}
          </div>

          {/* Transport */}
          <div className="flex items-center gap-6">
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
              className="rounded-full bg-white/10 p-4 text-white transition-colors hover:bg-white/20"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? <PlayIcon size={28} /> : <PauseIcon size={28} />}
            </button>
            {clips.length > 1 && currentIndex < clips.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                aria-label="Next clip"
              >
                <SkipIcon size={24} />
              </button>
            )}
          </div>

          {/* Collapse to mini-bar */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="mt-4 text-sm text-white/40 transition-colors hover:text-white/60"
          >
            Minimize
          </button>
        </div>
      )}

      {/* Progress dots — only for multi-clip queues, local playback */}
      {clips.length > 1 && !airplayActive && (
        <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 animate-fade-out">
          {clips.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === currentIndex ? "w-3 bg-white/40" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}

      {/* Exit button — appears after 3s */}
      {showControls && (
        <button
          onClick={handleExitTap}
          className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 transition-all duration-200 active:scale-95 active:bg-black/60"
          style={{
            WebkitTouchCallout: "none",
            userSelect: "none",
            touchAction: "none",
          }}
          aria-label="Exit player"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* AirPlay button — top-right, appears after 3s */}
      {showControls && airplayAvailable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            showAirPlayPicker();
          }}
          className={`absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
            airplayActive ? "text-blue-400" : "text-white/30"
          }`}
          style={{
            WebkitTouchCallout: "none",
            userSelect: "none",
            touchAction: "none",
          }}
          aria-label={airplayActive ? "AirPlay connected" : "AirPlay"}
        >
          <AirPlayIcon size={22} />
        </button>
      )}

      {/* Hint text */}
      {!airplayActive && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 animate-fade-out text-center">
          <p className="text-xs text-white/40">Triple-tap or tap X to exit</p>
        </div>
      )}

      {/* AirPlay error toast */}
      {airplayError && (
        <div className="absolute bottom-20 left-0 right-0 text-center animate-fade-out">
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
            {airplayError}
          </span>
        </div>
      )}

      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <ExitConfirmDialog onConfirm={confirmExit} onCancel={cancelExit} />
      )}

      {/* Disconnect toast */}
      {disconnectToast && (
        <div className="absolute top-8 left-0 right-0 text-center">
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
            TV disconnected — playing on phone
          </span>
        </div>
      )}
    </div>
  );
}

// ── Exit Confirmation ──

function ExitConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-8 rounded-2xl bg-card p-6 text-center shadow-2xl">
        <p className="text-base font-medium">Stop playing on TV?</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/80"
          >
            Keep Playing
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Icons ──

function AirPlayIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
      <polygon points="12 15 17 21 7 21 12 15" />
    </svg>
  );
}

function PlayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function SkipIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 4l10 8-10 8V4z" />
      <rect x="17" y="4" width="2" height="16" />
    </svg>
  );
}

function ExpandIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
