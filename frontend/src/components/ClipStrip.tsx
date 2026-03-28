"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { BrowseClip, getThumbnailUrl } from "@/lib/api";
import { getClipTitle, getClipSubtitle, getClipLabel } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";

interface ClipStripProps {
  name: string;
  tag: string;
  count: number;
  clips: BrowseClip[];
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onPreview: (clip: BrowseClip) => void;
  onShowJulian: (clip: BrowseClip) => void;
}

function ClipCard({ clip, onPreview }: { clip: BrowseClip; onPreview: (clip: BrowseClip) => void }) {
  const { addToQueue, isInQueue, queuePosition } = useQueue();
  const inQueue = isInQueue(clip.scene_id);
  const pos = queuePosition(clip.scene_id);

  return (
    <div>
      {/* Thumbnail */}
      <button
        onClick={() => onPreview(clip)}
        className="group relative aspect-video w-full overflow-hidden rounded-xl bg-muted transition-transform duration-150 ease-out active:scale-[0.97]"
        aria-label={`Preview: ${getClipLabel(clip, 60)}`}
      >
        <img
          src={getThumbnailUrl(clip.scene_id)}
          alt={getClipLabel(clip, 60)}
          className="h-full w-full object-cover"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
        <span className="absolute bottom-1 right-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
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
          className={`absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold backdrop-blur-sm transition-all ${
            inQueue
              ? "bg-primary text-primary-foreground animate-pop"
              : "bg-black/60 text-white"
          }`}
          aria-label={inQueue ? `In queue (${pos})` : "Add to queue"}
        >
          {inQueue ? pos : "+"}
        </div>
      </button>

      {/* Title + subtitle */}
      <p className="mt-2 line-clamp-1 text-xs font-semibold leading-tight tracking-tight">
        {getClipTitle(clip)}
      </p>
      {getClipSubtitle(clip) && (
        <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-muted-foreground">
          {getClipSubtitle(clip)}
        </p>
      )}
    </div>
  );
}

export function ClipStrip({ name, count, clips, isExpanded, onExpand, onCollapse, onPreview }: ClipStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    setCanScrollLeft(el.scrollLeft > 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, clips]);

  // Preload thumbnails ahead of viewport
  const thumbnailUrls = useMemo(
    () => new Map(clips.map((c) => [c.scene_id, getThumbnailUrl(c.scene_id)])),
    [clips]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const url = (entry.target as HTMLElement).dataset.thumbnailUrl;
            if (url) {
              const img = new Image();
              img.src = url;
            }
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "200px 400px 200px 400px" }
    );

    const items = container.querySelectorAll("[data-thumbnail-url]");
    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [clips, isExpanded]);

  return (
    <div ref={containerRef} className="clip-strip space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight font-heading">
          {name}
          <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
        </h2>
        {clips.length > 5 && (
          <button
            onClick={isExpanded ? onCollapse : onExpand}
            className="flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {isExpanded ? (
              <>
                Show less
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </>
            ) : (
              <>
                See all
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {isExpanded ? (
        /* Expanded grid */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 animate-[fade-in_0.3s_ease-out]">
          {clips.map((clip) => (
            <div key={clip.scene_id} data-thumbnail-url={thumbnailUrls.get(clip.scene_id)}>
              <ClipCard clip={clip} onPreview={onPreview} />
            </div>
          ))}
        </div>
      ) : (
        /* Horizontal scroll with fade edges */
        <div className="relative -mx-4 px-4">
          {/* Left fade */}
          <div className={`pointer-events-none absolute bottom-2 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-300 ease-in-out ${canScrollLeft ? "opacity-100" : "opacity-0"}`} />
          {/* Right fade */}
          <div className={`pointer-events-none absolute bottom-2 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 ease-in-out ${canScrollRight ? "opacity-100" : "opacity-0"}`} />

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
          >
            {clips.slice(0, 20).map((clip) => (
              <div
                key={clip.scene_id}
                className="flex-none snap-start"
                style={{ width: "156px" }}
                data-thumbnail-url={thumbnailUrls.get(clip.scene_id)}
              >
                <ClipCard clip={clip} onPreview={onPreview} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
