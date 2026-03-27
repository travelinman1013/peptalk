"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClipSuggestions, getThumbnailUrl, BrowseClip } from "@/lib/api";
import { getClipTitle } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";

const AUTO_DISMISS_MS = 8000;

export function ClipSuggestions() {
  const { lastAddedSceneId, addToQueue, isInQueue, queuePosition, dismissSuggestions } = useQueue();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useQuery({
    queryKey: ["suggestions", lastAddedSceneId],
    queryFn: () => getClipSuggestions(lastAddedSceneId!),
    enabled: !!lastAddedSceneId,
  });

  // Auto-dismiss timer — resets when lastAddedSceneId changes
  useEffect(() => {
    if (!lastAddedSceneId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismissSuggestions, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lastAddedSceneId, dismissSuggestions]);

  if (!lastAddedSceneId || !data) return null;

  const { next_in_episode, related } = data;
  if (next_in_episode.length === 0 && related.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 shadow-2xl backdrop-blur-md animate-fade-in">
      <div className="mx-auto max-w-lg p-3">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Add more?
          </p>
          <button
            onClick={dismissSuggestions}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss suggestions"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Next in episode */}
        {next_in_episode.length > 0 && (
          <div className="mb-2">
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Next in episode
            </p>
            <div className="flex gap-2">
              {next_in_episode.map((clip: BrowseClip) => (
                <SuggestionCard
                  key={clip.scene_id}
                  clip={clip}
                  inQueue={isInQueue(clip.scene_id)}
                  pos={queuePosition(clip.scene_id)}
                  onAdd={() => addToQueue(clip)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Related from other episodes */}
        {related.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              From other episodes
            </p>
            <div className="flex gap-2">
              {related.map((clip: BrowseClip) => (
                <SuggestionCard
                  key={clip.scene_id}
                  clip={clip}
                  inQueue={isInQueue(clip.scene_id)}
                  pos={queuePosition(clip.scene_id)}
                  onAdd={() => addToQueue(clip)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  clip,
  inQueue,
  pos,
  onAdd,
}: {
  clip: BrowseClip;
  inQueue: boolean;
  pos: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted/50 p-1.5">
      {/* Thumbnail */}
      <div className="relative h-12 w-20 flex-none overflow-hidden rounded-md bg-muted">
        <img
          src={getThumbnailUrl(clip.scene_id)}
          alt={getClipTitle(clip)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-medium text-white">
          {Math.round(clip.duration)}s
        </span>
      </div>
      {/* Info + button */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-[11px] font-medium leading-tight">
          {getClipTitle(clip)}
        </p>
        <button
          onClick={onAdd}
          disabled={inQueue}
          className={`self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
            inQueue
              ? "bg-primary text-primary-foreground"
              : "bg-foreground text-background hover:bg-foreground/80"
          }`}
        >
          {inQueue ? `#${pos}` : "+ Add"}
        </button>
      </div>
    </div>
  );
}
