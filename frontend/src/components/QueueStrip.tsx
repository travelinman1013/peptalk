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

  // Cleanup undo timer
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

  // Show undo toast after clear
  if (queue.length === 0 && undoQueue) {
    return (
      <div className="border-t border-border bg-card px-4 py-2">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <p className="text-xs text-muted-foreground">Queue cleared</p>
          <button onClick={handleUndo} className="text-xs font-medium text-primary">
            Undo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card px-4 py-2.5">
      <div className="mx-auto max-w-lg space-y-2">
        {/* Queue thumbnails */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="flex-none text-xs font-medium text-muted-foreground">
            Queue ({queue.length})
          </span>
          {queue.map((clip, i) => (
            <div key={clip.scene_id} className="group relative flex-none">
              <div className="relative h-[27px] w-[48px] overflow-hidden rounded">
                <img
                  src={getThumbnailUrl(clip.scene_id)}
                  alt={getClipLabel(clip, 30)}
                  className="h-full w-full object-cover"
                />
                {/* Position number */}
                <span className="absolute bottom-0 left-0 bg-black/70 px-1 text-[9px] font-medium text-white">
                  {i + 1}
                </span>
              </div>
              {/* Remove button */}
              <button
                onClick={() => removeFromQueue(clip.scene_id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${getClipLabel(clip, 30)} from queue`}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleSave} disabled={!playlistName.trim()} className="text-xs h-7">
              Save
            </Button>
            <button onClick={() => setShowSave(false)} className="text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onPlayAll} className="text-xs h-7">
              Play All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSave(true)}
              className="text-xs h-7"
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
