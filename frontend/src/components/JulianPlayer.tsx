"use client";

import { useRef, useEffect, useCallback } from "react";
import { ClipResult, getVideoUrl } from "@/lib/api";

interface JulianPlayerProps {
  clip: ClipResult;
  onExit: () => void;
}

export function JulianPlayer({ clip, onExit }: JulianPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // Prevent screen from dimming by keeping video active
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {
      // Autoplay blocked — user needs to tap
    });

    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Handle video end — return to calm state, don't autoplay next
  const handleEnded = useCallback(() => {
    // Show a calm screen briefly, then exit
    setTimeout(onExit, 2000);
  }, [onExit]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={handleTap}
      role="dialog"
      aria-label="Playing clip for Julian. Triple-tap to exit."
    >
      {/* Fade in */}
      <div className="animate-fade-in h-full w-full">
        <video
          ref={videoRef}
          src={getVideoUrl(clip.scene_id)}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          onEnded={handleEnded}
          aria-label={clip.narrative_summary || "Peppa Pig clip"}
        />
      </div>

      {/* Hidden exit hint — only visible briefly on first open */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 animate-fade-out text-center">
        <p className="text-xs text-white/40">Triple-tap anywhere to exit</p>
      </div>
    </div>
  );
}
