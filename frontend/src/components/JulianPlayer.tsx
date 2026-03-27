"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { ClipResult, BrowseClip, getVideoUrl } from "@/lib/api";

interface JulianPlayerProps {
  clips: (ClipResult | BrowseClip)[];
  onExit: () => void;
}

export function JulianPlayer({ clips, onExit }: JulianPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExitButton, setShowExitButton] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const currentClip = clips[currentIndex];
  const nextClip = currentIndex < clips.length - 1 ? clips[currentIndex + 1] : null;

  // Triple-tap to exit (hidden gesture for Sam)
  const handleTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      onExit();
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 500);
  }, [onExit]);

  // Show exit button after 3s delay
  useEffect(() => {
    const timer = setTimeout(() => setShowExitButton(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  // Auto-play when currentIndex changes
  useEffect(() => {
    if (currentIndex > 0) {
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
      }
    }
  }, [currentIndex]);

  const handleEnded = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      // Transition to next clip
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setTransitioning(false);
      }, 500);
    } else {
      // Last clip — exit after delay
      setTimeout(onExit, 2000);
    }
  }, [currentIndex, clips.length, onExit]);

  // Long-press exit: 800ms hold to activate
  const handlePressStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setPressing(true);
      pressTimerRef.current = setTimeout(() => {
        setPressing(false);
        onExit();
      }, 800);
    },
    [onExit]
  );

  const handlePressEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setPressing(false);
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = undefined;
      }
    },
    []
  );

  const label =
    ("narrative_summary" in currentClip ? currentClip.narrative_summary : "") ||
    "Peppa Pig clip";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={handleTap}
      role="dialog"
      aria-label="Playing clip for Julian. Triple-tap or hold X to exit."
    >
      {/* Video */}
      <div className={`animate-fade-in h-full w-full transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}>
        <video
          key={currentClip.scene_id}
          ref={videoRef}
          src={getVideoUrl(currentClip.scene_id)}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          onEnded={handleEnded}
          aria-label={label}
        />
      </div>

      {/* Preload next video */}
      {nextClip && (
        <video
          key={`preload-${nextClip.scene_id}`}
          src={getVideoUrl(nextClip.scene_id)}
          preload="auto"
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Long-press exit button — appears after 3s */}
      {showExitButton && (
        <button
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
          style={{
            opacity: pressing ? 0.6 : 0.3,
            transform: pressing ? "scale(1.1)" : "scale(1)",
            WebkitTouchCallout: "none",
            userSelect: "none",
            touchAction: "none",
          }}
          aria-label="Hold to exit"
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

      {/* Progress dots — only show for multi-clip queues */}
      {clips.length > 1 && (
        <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 animate-fade-out">
          {clips.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === currentIndex ? "bg-white/40 w-3" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-0 right-0 animate-fade-out text-center">
        <p className="text-xs text-white/40">Triple-tap or hold X to exit</p>
      </div>
    </div>
  );
}
