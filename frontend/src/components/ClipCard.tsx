"use client";

import { ClipResult, getThumbnailUrl } from "@/lib/api";

interface ClipCardProps {
  clip: ClipResult;
  onPreview: (clip: ClipResult) => void;
  onShowJulian: (clip: ClipResult) => void;
}

export function ClipCard({ clip, onPreview, onShowJulian }: ClipCardProps) {
  const label =
    clip.parent_trigger_phrases?.[0] ||
    clip.narrative_summary ||
    clip.scene_id;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Thumbnail — tap to preview */}
      <button
        onClick={() => onPreview(clip)}
        className="relative aspect-video w-full overflow-hidden bg-gray-100"
        aria-label={`Preview: ${label}`}
      >
        <img
          src={getThumbnailUrl(clip.scene_id)}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20">
          <div className="rounded-full bg-white/80 p-2 shadow">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-gray-700"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Duration badge */}
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
          {Math.round(clip.duration)}s
        </span>
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
          {label}
        </p>
        {clip.emotional_tone && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {clip.emotional_tone}
          </p>
        )}
        {/* Show Julian button */}
        <button
          onClick={() => onShowJulian(clip)}
          className="mt-auto rounded-lg bg-blue-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 active:bg-blue-700"
          aria-label={`Show Julian: ${label}`}
        >
          Show Julian
        </button>
      </div>
    </div>
  );
}
