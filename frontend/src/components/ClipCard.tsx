"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipResult, BrowseClip, isClipResult, getThumbnailUrl } from "@/lib/api";
import { getClipTitle, getClipSubtitle, getClipLabel } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";

interface ClipCardProps {
  clip: ClipResult | BrowseClip;
  onPreview: (clip: ClipResult | BrowseClip) => void;
  onShowJulian: (clip: ClipResult | BrowseClip) => void;
  compact?: boolean;
}

export function ClipCard({ clip, onPreview, onShowJulian, compact }: ClipCardProps) {
  const label = getClipLabel(clip);
  const { addToQueue, isInQueue, queuePosition } = useQueue();
  const inQueue = isInQueue(clip.scene_id);
  const pos = queuePosition(clip.scene_id);

  const energyLevel = clip.energy_level;
  const activityTags = isClipResult(clip) ? clip.activity_tags : undefined;

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Play icon — visible on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="rounded-full bg-white/90 p-2.5 shadow-lg backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Duration */}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {Math.round(clip.duration)}s
        </span>

        {/* Add to queue button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(clip);
          }}
          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
            inQueue
              ? "bg-primary text-primary-foreground"
              : "bg-black/60 text-white opacity-0 group-hover:opacity-100"
          }`}
          aria-label={inQueue ? `In queue (${pos})` : "Add to queue"}
        >
          {inQueue ? pos : "+"}
        </button>
      </button>

      {/* Content */}
      <div className={`flex flex-col gap-2 ${compact ? "p-2.5" : "p-3"}`}>
        <p className="line-clamp-1 text-sm font-semibold leading-snug">
          {getClipTitle(clip)}
        </p>
        {getClipSubtitle(clip) && (
          <p className="line-clamp-1 text-xs leading-snug text-muted-foreground">
            {getClipSubtitle(clip)}
          </p>
        )}

        {!compact && (
          <div className="flex flex-wrap gap-1">
            {energyLevel && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {energyLevel}
              </Badge>
            )}
            {activityTags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {!compact && (
          <Button
            size="sm"
            onClick={() => onShowJulian(clip)}
            className="mt-auto w-full"
            aria-label={`Show Julian: ${label}`}
          >
            Show Julian
          </Button>
        )}
      </div>
    </Card>
  );
}
