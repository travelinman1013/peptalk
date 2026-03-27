"use client";

import { ClipResult, BrowseClip } from "@/lib/api";
import { ClipCard } from "./ClipCard";

interface ClipGridProps {
  clips: (ClipResult | BrowseClip)[];
  onPreview: (clip: ClipResult | BrowseClip) => void;
  onShowJulian: (clip: ClipResult | BrowseClip) => void;
}

export function ClipGrid({ clips, onPreview, onShowJulian }: ClipGridProps) {
  if (clips.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg className="text-primary" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <p className="text-base font-medium text-muted-foreground">No clips match that phrase</p>
        <p className="text-sm text-muted-foreground/60">
          Try something like &ldquo;time for dinner&rdquo; or &ldquo;let&apos;s play outside&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
      {clips.map((clip) => (
        <ClipCard
          key={clip.scene_id}
          clip={clip}
          onPreview={onPreview}
          onShowJulian={onShowJulian}
        />
      ))}
    </div>
  );
}
