"use client";

import { BrowseClip, getThumbnailUrl, getVideoUrl } from "@/lib/api";

interface ClipStripProps {
  name: string;
  tag: string;
  count: number;
  clips: BrowseClip[];
  onPreview: (clip: BrowseClip) => void;
  onShowJulian: (clip: BrowseClip) => void;
}

export function ClipStrip({ name, count, clips, onPreview, onShowJulian }: ClipStripProps) {
  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight">
          {name}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {count}
          </span>
        </h2>
      </div>

      {/* Horizontal scroll */}
      <div className="-mx-4 px-4">
        <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
          {clips.map((clip) => (
            <div
              key={clip.scene_id}
              className="flex-none snap-start"
              style={{ width: "140px" }}
            >
              {/* Thumbnail */}
              <button
                onClick={() => onPreview(clip)}
                className="group relative aspect-video w-full overflow-hidden rounded-lg bg-muted"
                aria-label={`Preview: ${clip.label}`}
              >
                <img
                  src={getThumbnailUrl(clip.scene_id)}
                  alt={clip.label || clip.scene_id}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
                  {Math.round(clip.duration)}s
                </span>
              </button>

              {/* Label */}
              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight">
                {clip.label || clip.narrative_summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
