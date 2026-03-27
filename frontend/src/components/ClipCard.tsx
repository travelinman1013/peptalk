"use client";

import { ClipResult, BrowseClip, getThumbnailUrl } from "@/lib/api";
import { getClipTitle, getClipSubtitle, getClipLabel } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";

interface ClipCardProps {
  clip: ClipResult | BrowseClip;
  onPreview: (clip: ClipResult | BrowseClip) => void;
  onShowJulian: (clip: ClipResult | BrowseClip) => void;
  compact?: boolean;
}

export function ClipCard({ clip, onPreview }: ClipCardProps) {
  const label = getClipLabel(clip);
  const { addToQueue, isInQueue, queuePosition } = useQueue();
  const inQueue = isInQueue(clip.scene_id);
  const pos = queuePosition(clip.scene_id);
  const emotionalTone = clip.emotional_tone;

  return (
    <div className="group overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 hover:ring-foreground/10 active:scale-[0.98]">
      {/* Thumbnail */}
      <button
        onClick={() => onPreview(clip)}
        className="relative aspect-video w-full overflow-hidden bg-muted"
        aria-label={`Preview: ${label}`}
      >
        <img
          src={getThumbnailUrl(clip.scene_id)}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
        {/* Play icon — visible on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="rounded-full bg-primary/90 p-2.5 shadow-lg backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Duration */}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
          {Math.round(clip.duration)}s
        </span>

        {/* Add to queue button */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(clip);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              addToQueue(clip);
            }
          }}
          className={`absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold backdrop-blur-sm transition-all ${
            inQueue
              ? "bg-primary text-primary-foreground animate-pop"
              : "bg-black/60 text-white"
          }`}
          aria-label={inQueue ? `In queue (${pos})` : "Add to queue"}
        >
          {inQueue ? pos : "+"}
        </div>
      </button>

      {/* Content */}
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold leading-snug tracking-tight">
          {getClipTitle(clip)}
        </p>
        {getClipSubtitle(clip) && (
          <p className="mt-1 line-clamp-1 text-xs leading-snug text-muted-foreground">
            {getClipSubtitle(clip)}
          </p>
        )}
        {emotionalTone && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">
            {emotionalTone}
          </p>
        )}
      </div>
    </div>
  );
}
