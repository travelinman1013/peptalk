"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipResult, BrowseClip, getVideoUrl, getThumbnailUrl } from "@/lib/api";

interface VideoPreviewProps {
  clip: ClipResult | BrowseClip;
  onClose: () => void;
  onShowJulian: () => void;
}

export function VideoPreview({ clip, onClose, onShowJulian }: VideoPreviewProps) {
  const label =
    ("parent_trigger_phrases" in clip ? clip.parent_trigger_phrases?.[0] : null) ||
    ("label" in clip ? clip.label : null) ||
    clip.narrative_summary ||
    clip.scene_id;

  const characters = clip.characters_present || [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-2xl">
      <div className="mx-auto max-w-lg p-3">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview
          </p>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close preview"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video */}
        <video
          src={getVideoUrl(clip.scene_id)}
          className="w-full rounded-lg"
          controls
          muted
          playsInline
          autoPlay
          aria-label={`Preview of: ${label}`}
        />

        {/* Info */}
        <div className="mt-2.5 space-y-2">
          <p className="text-sm font-semibold">{label}</p>

          {characters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {characters.map((char) => (
                <Badge key={char} variant="secondary" className="text-[10px]">
                  {char}
                </Badge>
              ))}
            </div>
          )}

          <Button onClick={onShowJulian} className="w-full" size="lg">
            Show Julian
          </Button>
        </div>
      </div>
    </div>
  );
}
