"use client";

import { ClipResult } from "@/lib/api";
import { ClipCard } from "./ClipCard";

interface ClipGridProps {
  clips: ClipResult[];
  onPreview: (clip: ClipResult) => void;
  onShowJulian: (clip: ClipResult) => void;
}

export function ClipGrid({ clips, onPreview, onShowJulian }: ClipGridProps) {
  if (clips.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p className="text-lg">No clips found</p>
        <p className="mt-1 text-sm">Try a different phrase</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
