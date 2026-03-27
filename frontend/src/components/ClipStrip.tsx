"use client";

import { BrowseClip, getThumbnailUrl } from "@/lib/api";
import { getClipTitle, getClipSubtitle, getClipLabel } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";

interface ClipStripProps {
  name: string;
  tag: string;
  count: number;
  clips: BrowseClip[];
  onPreview: (clip: BrowseClip) => void;
  onShowJulian: (clip: BrowseClip) => void;
}

export function ClipStrip({ name, count, clips, onPreview }: ClipStripProps) {
  const { addToQueue, isInQueue, queuePosition } = useQueue();

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
          {clips.map((clip) => {
            const inQueue = isInQueue(clip.scene_id);
            const pos = queuePosition(clip.scene_id);

            return (
              <div
                key={clip.scene_id}
                className="flex-none snap-start"
                style={{ width: "140px" }}
              >
                {/* Thumbnail */}
                <button
                  onClick={() => onPreview(clip)}
                  className="group relative aspect-video w-full overflow-hidden rounded-lg bg-muted"
                  aria-label={`Preview: ${getClipLabel(clip, 60)}`}
                >
                  <img
                    src={getThumbnailUrl(clip.scene_id)}
                    alt={getClipLabel(clip, 60)}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
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
                    className={`absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                      inQueue
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/60 text-white opacity-0 group-hover:opacity-100"
                    }`}
                    aria-label={inQueue ? `In queue (${pos})` : "Add to queue"}
                  >
                    {inQueue ? pos : "+"}
                  </div>
                </button>

                {/* Title + subtitle */}
                <p className="mt-1.5 line-clamp-1 text-xs font-medium leading-tight">
                  {getClipTitle(clip)}
                </p>
                {getClipSubtitle(clip) && (
                  <p className="line-clamp-1 text-[10px] leading-tight text-muted-foreground">
                    {getClipSubtitle(clip)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
