"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipResult, BrowseClip, isClipResult, getVideoUrl } from "@/lib/api";
import { getClipTitle, getClipSubtitle, getClipLabel } from "@/lib/clip-labels";
import { useQueue } from "@/lib/queue-context";
import { useAirPlay } from "@/lib/hooks/use-airplay";

interface VideoPreviewProps {
  clip: ClipResult | BrowseClip;
  isFavorited: boolean;
  isHidden: boolean;
  onToggleFavorite: () => void;
  onHide: () => void;
  onClose: () => void;
  onShowJulian: () => void;
}

export function VideoPreview({ clip, isFavorited, isHidden, onToggleFavorite, onHide, onClose, onShowJulian }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addToQueue, isInQueue } = useQueue();
  const { airplayAvailable, airplayActive, showAirPlayPicker } = useAirPlay(videoRef);
  const inQueue = isInQueue(clip.scene_id);
  const title = getClipTitle(clip);
  const subtitle = getClipSubtitle(clip);
  const label = getClipLabel(clip);
  const characters = clip.characters_present || [];
  const emotionalTone = clip.emotional_tone;
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const keyDialogue = isClipResult(clip)
    ? clip.key_dialogue
    : clip.key_dialogue ?? [];

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleToggleFavorite = useCallback(() => {
    setHeartAnimating(true);
    onToggleFavorite();
    setTimeout(() => setHeartAnimating(false), 300);
  }, [onToggleFavorite]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
        style={isClosing ? { animationDuration: "200ms" } : { animationDuration: "200ms" }}
        onClick={handleClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.3)] ${
          isClosing ? "" : "animate-slide-up"
        }`}
        style={isClosing ? { transform: "translateY(100%)", transition: "transform 200ms ease-in" } : undefined}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="mx-auto max-w-lg max-h-[85dvh] overflow-y-auto px-5 pb-6">
          {/* Top bar: hide (left) + close (right) */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={onHide}
              className={`rounded-full p-1.5 transition-colors ${isHidden ? "text-destructive" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              aria-label={isHidden ? "Clip is hidden" : "Hide clip"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close preview"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            src={getVideoUrl(clip.scene_id)}
            className="w-full rounded-2xl ring-1 ring-white/5"
            controls
            muted
            playsInline
            autoPlay
            aria-label={`Preview of: ${label}`}
          />

          {/* Info */}
          <div className="mt-3 space-y-3">
            {/* Title + favorite heart */}
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-bold flex-1">{title}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
                className={`ml-2 flex-none p-1 transition-colors ${heartAnimating ? "animate-heart-pop" : ""}`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={isFavorited ? "var(--favorite)" : "none"}
                  stroke={isFavorited ? "var(--favorite)" : "currentColor"}
                  strokeWidth="2"
                  className={isFavorited ? "" : "text-muted-foreground"}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Descriptive subtitle */}
            {subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {subtitle}
              </p>
            )}

            {/* Characters + emotional tone */}
            {(characters.length > 0 || emotionalTone) && (
              <div className="flex flex-wrap gap-1.5">
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

            {/* Key dialogue */}
            {keyDialogue.length > 0 && (
              <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-1">
                {keyDialogue.slice(0, 2).map((line, i) => (
                  <p key={i} className="text-xs italic text-muted-foreground leading-relaxed">
                    &ldquo;{line}&rdquo;
                  </p>
                ))}
              </div>
            )}

            {/* Primary CTA — Show Julian */}
            <Button
              onClick={onShowJulian}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/90 font-heading text-[0.9375rem] font-bold shadow-[0_0_20px_var(--primary)/25%,0_2px_8px_rgba(0,0,0,0.3)] hover:from-primary/90 hover:to-primary/80"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                <path d="M8 5v14l11-7z" />
              </svg>
              Show Julian
            </Button>

            {/* Secondary actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => addToQueue(clip)}
                disabled={inQueue}
                className="flex-1 rounded-xl"
              >
                {inQueue ? "In Queue" : "Add to Queue"}
              </Button>

              {/* AirPlay — visible when a device is on the network */}
              {airplayAvailable && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={showAirPlayPicker}
                  className="h-10 w-10 rounded-xl flex-none"
                  aria-label={airplayActive ? "AirPlay Connected" : "AirPlay"}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={airplayActive ? "text-primary" : ""}
                  >
                    <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
                    <polygon points="12 15 17 21 7 21 12 15" />
                  </svg>
                </Button>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
