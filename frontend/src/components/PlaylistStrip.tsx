"use client";

import { useCallback, useRef, useState } from "react";
import { getThumbnailUrl } from "@/lib/api";
import type { PlaylistRecord } from "@/lib/db";

interface PlaylistStripProps {
  playlists: PlaylistRecord[];
  onPlay: (playlist: PlaylistRecord) => void;
  onDelete: (id: string) => void;
}

export function PlaylistStrip({ playlists, onPlay, onDelete }: PlaylistStripProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleLongPressStart = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setConfirmDeleteId(id);
    }, 600);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  if (playlists.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight font-heading">
          My Playlists
          <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground tabular-nums">
            {playlists.length}
          </span>
        </h2>
      </div>

      <div className="-mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
          {playlists.map((playlist) => {
            const thumbs = playlist.clips.slice(0, 3);

            return (
              <div
                key={playlist.id}
                className="flex-none snap-start"
                style={{ width: "172px" }}
              >
                {/* Thumbnail mosaic */}
                <button
                  onClick={() => {
                    if (confirmDeleteId === playlist.id) return;
                    onPlay(playlist);
                  }}
                  onTouchStart={() => handleLongPressStart(playlist.id)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                  onMouseDown={() => handleLongPressStart(playlist.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className="group relative aspect-video w-full overflow-hidden rounded-xl bg-muted transition-transform duration-150 active:scale-[0.97]"
                  aria-label={`Play playlist: ${playlist.name}`}
                >
                  {/* Stack up to 3 thumbnails with slight offset */}
                  <div className="relative h-full w-full">
                    {thumbs.map((clip, i) => (
                      <img
                        key={clip.scene_id}
                        src={getThumbnailUrl(clip.scene_id)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{
                          opacity: i === 0 ? 1 : 0.7,
                          clipPath: thumbs.length > 1
                            ? `inset(0 ${((thumbs.length - 1 - i) / thumbs.length) * 100}% 0 ${(i / thumbs.length) * 100}%)`
                            : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Clip count */}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
                    {playlist.clips.length} clips
                  </span>

                  {/* Play icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded-full bg-primary/90 p-2 shadow-lg backdrop-blur-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Delete confirmation */}
                {confirmDeleteId === playlist.id ? (
                  <div className="mt-1.5 flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDelete(playlist.id);
                        setConfirmDeleteId(null);
                      }}
                      className="text-[10px] font-medium text-destructive"
                    >
                      Delete
                    </button>
                    <span className="text-[10px] text-muted-foreground">|</span>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="mt-1.5 line-clamp-1 text-xs font-medium leading-tight">
                    {playlist.name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
