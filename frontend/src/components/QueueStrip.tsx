"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQueue } from "@/lib/queue-context";
import { getThumbnailUrl } from "@/lib/api";
import { getClipLabel } from "@/lib/clip-labels";
import type { ClipResult, BrowseClip } from "@/lib/api";

interface QueueStripProps {
  onPlayAll: () => void;
  onSavePlaylist: (name: string) => void;
}

export function QueueStrip({ onPlayAll, onSavePlaylist }: QueueStripProps) {
  const { queue, addToQueue, removeFromQueue, clearQueue } = useQueue();
  const [showSave, setShowSave] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [undoQueue, setUndoQueue] = useState<(ClipResult | BrowseClip)[] | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (queue.length > 0 && isFirstRender) {
      setIsFirstRender(false);
    }
  }, [queue.length, isFirstRender]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setUndoQueue([...queue]);
    clearQueue();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoQueue(null), 4000);
  }, [queue, clearQueue]);

  const handleUndo = useCallback(() => {
    if (undoQueue) {
      for (const clip of undoQueue) {
        addToQueue(clip);
      }
    }
    setUndoQueue(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoQueue, addToQueue]);

  const handleSave = useCallback(() => {
    if (playlistName.trim()) {
      onSavePlaylist(playlistName.trim());
      setPlaylistName("");
      setShowSave(false);
    }
  }, [playlistName, onSavePlaylist]);

  if (queue.length === 0 && !undoQueue) return null;

  // Undo toast after clear
  if (queue.length === 0 && undoQueue) {
    return (
      <div className="bg-card px-4 py-3 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.15)]">
        <div className="mx-auto flex max-w-lg items-center justify-between rounded-xl bg-muted/80 px-4 py-3 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Queue cleared</p>
          <button
            onClick={handleUndo}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card px-4 py-3 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.15)] ${!isFirstRender ? "" : "animate-slide-down-from-top"}`}>
      <div className="mx-auto max-w-lg space-y-2.5">
        {/* Queue thumbnails */}
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none">
          <span className="flex-none text-xs font-medium text-muted-foreground">
            Queue
          </span>
          <span className="flex-none inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-bold tabular-nums text-primary">
            {queue.length}
          </span>
          {queue.map((clip, i) => (
            <div key={clip.scene_id} className="group relative flex-none">
              <div className="relative h-10 w-[72px] overflow-hidden rounded-lg ring-1 ring-white/10">
                <img
                  src={getThumbnailUrl(clip.scene_id)}
                  alt={getClipLabel(clip, 30)}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 left-0 bg-black/70 px-1 text-[9px] font-medium text-white">
                  {i + 1}
                </span>
              </div>
              {/* Remove button — always visible */}
              <button
                onClick={() => removeFromQueue(clip.scene_id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card ring-1 ring-border shadow-sm"
                aria-label={`Remove ${getClipLabel(clip, 30)} from queue`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted-foreground">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        {showSave ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Playlist name..."
              className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleSave} disabled={!playlistName.trim()} className="text-xs h-8 rounded-xl">
              Save
            </Button>
            <button onClick={() => setShowSave(false)} className="text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onPlayAll} className="text-xs h-8 rounded-xl px-4">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSave(true)}
              className="text-xs h-8 rounded-xl"
            >
              Save Queue
            </Button>
            <button onClick={handleClear} className="ml-auto text-xs text-muted-foreground">
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
