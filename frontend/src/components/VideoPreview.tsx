"use client";

import { ClipResult, getVideoUrl } from "@/lib/api";

interface VideoPreviewProps {
  clip: ClipResult;
  onClose: () => void;
  onShowJulian: () => void;
}

export function VideoPreview({ clip, onClose, onShowJulian }: VideoPreviewProps) {
  const label =
    clip.parent_trigger_phrases?.[0] ||
    clip.narrative_summary ||
    clip.scene_id;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-lg p-3">
        {/* Close button */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Preview
          </p>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close preview"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l8 8M6 14l8-8" />
            </svg>
          </button>
        </div>

        {/* Video — muted preview for Sam */}
        <video
          src={getVideoUrl(clip.scene_id)}
          className="w-full rounded-lg"
          controls
          muted
          playsInline
          autoPlay
          aria-label={`Preview of: ${label}`}
        />

        {/* Info + action */}
        <div className="mt-2 flex items-center gap-3">
          <p className="flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
            {label}
          </p>
          <button
            onClick={onShowJulian}
            className="shrink-0 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 active:bg-blue-700"
          >
            Show Julian
          </button>
        </div>
      </div>
    </div>
  );
}
