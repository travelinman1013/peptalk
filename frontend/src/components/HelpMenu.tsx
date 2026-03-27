"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "peptalk-help-seen";

interface HelpMenuProps {
  hiddenCount?: number;
  onShowHidden?: () => void;
}

export function HelpMenu({ hiddenCount = 0, onShowHidden }: HelpMenuProps) {
  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setIsNew(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && isNew) {
      localStorage.setItem(STORAGE_KEY, "1");
      setIsNew(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative flex items-center gap-1.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Help and instructions"
        aria-expanded={open}
      >
        {/* Pulse ring for first-time users */}
        {isNew && (
          <span className="absolute inset-0 animate-help-pulse rounded-full bg-primary/30" />
        )}
        {/* Info circle icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        {isNew && (
          <Badge
            variant="secondary"
            className="relative whitespace-nowrap text-[10px] font-semibold leading-none"
          >
            Start here
          </Badge>
        )}
      </button>

      {/* Expandable panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm animate-slide-up rounded-2xl border border-border bg-card p-4 shadow-xl"
        >
          <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm text-card-foreground">
            <section>
              <h3 className="mb-1 font-semibold">What is PepTalk?</h3>
              <p className="text-muted-foreground">
                PepTalk helps you communicate using Peppa Pig clips.
                Type what you want to say and the app finds the best matching
                clip to play.
              </p>
            </section>

            <section>
              <h3 className="mb-1.5 font-semibold">How to Use</h3>
              <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-card-foreground">Search</strong> —
                  type a phrase in the search bar
                </li>
                <li>
                  <strong className="text-card-foreground">Preview</strong> —
                  tap a clip to watch it first
                </li>
                <li>
                  <strong className="text-card-foreground">Play</strong> — tap
                  &ldquo;Show Julian&rdquo; for fullscreen playback
                </li>
              </ol>
            </section>

            <section className="rounded-lg bg-muted/50 p-3">
              <h3 className="mb-1 font-semibold">📺 AirPlay</h3>
              <p className="text-muted-foreground">
                Tap the AirPlay icon on any clip to stream it to your TV.
                A miniplayer stays on your phone so you can keep browsing
                and queuing clips while Julian watches on the big screen.
              </p>
            </section>

            <section>
              <h3 className="mb-1.5 font-semibold">Features</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-card-foreground">Browse</strong> —
                  scroll through categories when not searching
                </li>
                <li>
                  <strong className="text-card-foreground">Queue</strong> — add
                  multiple clips and play them in sequence
                </li>
                <li>
                  <strong className="text-card-foreground">Favorites</strong> —
                  heart clips you use often for quick access
                </li>
                <li>
                  <strong className="text-card-foreground">Playlists</strong> —
                  save a queue as a named playlist to reuse later
                </li>
              </ul>
            </section>

            <section>
              <h3 className="mb-1.5 font-semibold">Tips</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  Triple-tap or tap <strong className="text-card-foreground">X</strong> to
                  exit the fullscreen player
                </li>
                <li>
                  Use the sun/moon icon to switch between light and dark mode
                </li>
              </ul>
            </section>

            {onShowHidden && (
              <button
                onClick={() => {
                  onShowHidden();
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                  <span className="font-medium">Hidden Clips</span>
                </span>
                {hiddenCount > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                    {hiddenCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
