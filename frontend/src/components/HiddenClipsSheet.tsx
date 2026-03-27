"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getHiddenClips, getThumbnailUrl } from "@/lib/api";
import { useHidden } from "@/lib/hooks/use-hidden";

interface HiddenClipsSheetProps {
  onClose: () => void;
}

export function HiddenClipsSheet({ onClose }: HiddenClipsSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const { unhideClip } = useHidden();

  const { data } = useQuery({
    queryKey: ["hidden"],
    queryFn: getHiddenClips,
  });

  const clips = data?.clips ?? [];

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
        style={{ animationDuration: "200ms" }}
        onClick={handleClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.3)] ${
          isClosing ? "" : "animate-slide-up"
        }`}
        style={isClosing ? { transform: "translateY(100%)", transition: "transform 200ms ease-in" } : undefined}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="mx-auto max-w-lg max-h-[85dvh] overflow-y-auto px-5 pb-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold">
              Hidden Clips ({clips.length})
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {clips.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto mb-3 text-muted-foreground/40"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <p className="text-sm text-muted-foreground">No hidden clips</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clips.map((clip) => (
                <div
                  key={clip.scene_id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-2.5"
                >
                  <img
                    src={getThumbnailUrl(clip.scene_id)}
                    alt=""
                    className="h-14 w-[100px] flex-none rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {clip.label || clip.narrative_summary || clip.scene_id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {clip.episode_id} &middot; {Math.round(clip.duration)}s
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unhideClip(clip.scene_id)}
                    className="flex-none rounded-lg text-xs"
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
