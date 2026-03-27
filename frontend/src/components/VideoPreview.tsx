"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipResult, BrowseClip, isClipResult, getVideoUrl } from "@/lib/api";
import { getClipLabel } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";

interface VideoPreviewProps {
  clip: ClipResult | BrowseClip;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onShowJulian: () => void;
}

export function VideoPreview({ clip, isFavorited, onToggleFavorite, onClose, onShowJulian }: VideoPreviewProps) {
  const { addToQueue, isInQueue } = useQueue();
  const inQueue = isInQueue(clip.scene_id);
  const label = getClipLabel(clip);
  const characters = clip.characters_present || [];
  const emotionalTone = clip.emotional_tone;

  // Get key_dialogue from either type
  const keyDialogue = isClipResult(clip)
    ? clip.key_dialogue
    : clip.key_dialogue ?? [];

  // Show narrative_summary only if meaningfully different from label
  const summary = clip.narrative_summary;
  const showSummary = summary && summary !== label && !label.startsWith(summary);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-2xl">
      <div className="mx-auto max-w-lg max-h-[85dvh] overflow-y-auto p-3">
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
          {/* Label + favorite heart */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex-1">{label}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="ml-2 flex-none p-1 transition-colors"
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isFavorited ? "#ef4444" : "none"}
                stroke={isFavorited ? "#ef4444" : "currentColor"}
                strokeWidth="2"
                className={isFavorited ? "" : "text-muted-foreground"}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Narrative summary — only if different from label */}
          {showSummary && (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {summary}
            </p>
          )}

          {/* Characters + emotional tone */}
          {(characters.length > 0 || emotionalTone) && (
            <div className="flex flex-wrap gap-1">
              {characters.map((char) => (
                <Badge key={char} variant="secondary" className="text-[10px]">
                  {char}
                </Badge>
              ))}
              {emotionalTone && (
                <Badge variant="outline" className="text-[10px]">
                  {emotionalTone}
                </Badge>
              )}
            </div>
          )}

          {/* Key dialogue — up to 2 lines */}
          {keyDialogue.length > 0 && (
            <div className="space-y-0.5">
              {keyDialogue.slice(0, 2).map((line, i) => (
                <p key={i} className="text-xs italic text-muted-foreground">
                  &ldquo;{line}&rdquo;
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => addToQueue(clip)}
              disabled={inQueue}
              className="flex-1"
            >
              {inQueue ? "In Queue" : "Add to Queue"}
            </Button>
            <Button onClick={onShowJulian} size="lg" className="flex-1">
              Show Julian
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
