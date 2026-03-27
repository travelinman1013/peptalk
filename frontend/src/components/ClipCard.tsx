"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipResult, getThumbnailUrl } from "@/lib/api";

interface ClipCardProps {
  clip: ClipResult;
  onPreview: (clip: ClipResult) => void;
  onShowJulian: (clip: ClipResult) => void;
  compact?: boolean;
}

export function ClipCard({ clip, onPreview, onShowJulian, compact }: ClipCardProps) {
  const label =
    clip.parent_trigger_phrases?.[0] ||
    clip.narrative_summary ||
    clip.scene_id;

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
      </button>

      {/* Content */}
      <div className={`flex flex-col gap-2 ${compact ? "p-2.5" : "p-3"}`}>
        <p className="line-clamp-2 text-sm font-semibold leading-snug">
          {label}
        </p>

        {!compact && (
          <div className="flex flex-wrap gap-1">
            {clip.energy_level && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {clip.energy_level}
              </Badge>
            )}
            {clip.activity_tags?.slice(0, 2).map((tag) => (
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
