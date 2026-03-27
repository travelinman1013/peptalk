"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchClips, browseCategories, ClipResult, BrowseClip } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { ClipGrid } from "@/components/ClipGrid";
import { ClipStrip } from "@/components/ClipStrip";
import { VideoPreview } from "@/components/VideoPreview";
import { JulianPlayer } from "@/components/JulianPlayer";
import { QueueStrip } from "@/components/QueueStrip";
import { PlaylistStrip } from "@/components/PlaylistStrip";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { useRecentlyUsed } from "@/lib/hooks/use-recently-used";
import { usePlaylists } from "@/lib/hooks/use-playlists";
import { useQueue } from "@/lib/queue-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClipSuggestions } from "@/components/ClipSuggestions";

export default function Home() {
  const [query, setQuery] = useState("");
  const [previewClip, setPreviewClip] = useState<ClipResult | BrowseClip | null>(null);
  const [julianClips, setJulianClips] = useState<(ClipResult | BrowseClip)[]>([]);

  // Persistence hooks
  const { favorites, favoriteIds, toggleFavorite } = useFavorites();
  const { recentClips, recordUsage } = useRecentlyUsed(20);
  const { playlists, savePlaylist, deletePlaylist, markPlayed } = usePlaylists();
  const { queue, clearQueue } = useQueue();

  // Search results
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchClips(query),
    enabled: query.length > 0,
  });

  // Browse categories (load on mount)
  const { data: browseData } = useQuery({
    queryKey: ["browse"],
    queryFn: () => browseCategories(12),
  });

  const searchResults = searchData?.groups?.[0]?.results ?? [];
  const categories = browseData?.categories ?? [];

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handlePreview = useCallback((clip: ClipResult | BrowseClip) => {
    setPreviewClip(clip);
  }, []);

  const handleShowJulian = useCallback((clip: ClipResult | BrowseClip) => {
    setPreviewClip(null);
    setJulianClips([clip]);
    recordUsage(clip);
  }, [recordUsage]);

  const handlePlayQueue = useCallback(() => {
    if (queue.length === 0) return;
    setPreviewClip(null);
    setJulianClips([...queue]);
    // Record usage for each clip in queue
    for (const clip of queue) {
      recordUsage(clip);
    }
    clearQueue();
  }, [queue, clearQueue, recordUsage]);

  const handleSavePlaylist = useCallback((name: string) => {
    savePlaylist({ name, clips: queue });
  }, [queue, savePlaylist]);

  const handlePlayPlaylist = useCallback((playlist: { id: string; clips: BrowseClip[] }) => {
    setPreviewClip(null);
    setJulianClips([...playlist.clips]);
    markPlayed(playlist.id);
    for (const clip of playlist.clips) {
      recordUsage(clip);
    }
  }, [markPlayed, recordUsage]);

  const handleExitJulian = useCallback(() => {
    setJulianClips([]);
  }, []);

  const isSearching = query.length > 0;
  const isPlaying = julianClips.length > 0;

  return (
    <>
      {/* Julian Player — fullscreen, no chrome */}
      {isPlaying && (
        <JulianPlayer clips={julianClips} onExit={handleExitJulian} />
      )}

      {/* Main app */}
      <div className="flex min-h-[100dvh] flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 px-4 pb-3 pt-4 backdrop-blur-xl">
          <div className="relative mb-3 flex items-center justify-center">
            <h1 className="text-lg font-bold tracking-tight">PepTalk</h1>
            <div className="absolute right-0">
              <ThemeToggle />
            </div>
          </div>
          <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
        </header>

        {/* Queue strip — below header */}
        <QueueStrip onPlayAll={handlePlayQueue} onSavePlaylist={handleSavePlaylist} />

        {/* Content */}
        <main className="flex-1 px-4 py-4">
          {isSearching ? (
            /* Search results */
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {searchResults.length} results for &ldquo;{query}&rdquo;
              </p>
              <ClipGrid
                clips={searchResults}
                onPreview={handlePreview}
                onShowJulian={handleShowJulian}
              />
            </div>
          ) : (
            /* Category browse */
            <div className="space-y-6">
              {/* Recently Used */}
              {recentClips.length > 0 && (
                <ClipStrip
                  name="Recently Used"
                  tag="_recent"
                  count={recentClips.length}
                  clips={recentClips}
                  onPreview={handlePreview}
                  onShowJulian={handleShowJulian}
                />
              )}

              {/* Saved Playlists */}
              {playlists.length > 0 && (
                <PlaylistStrip
                  playlists={playlists}
                  onPlay={handlePlayPlaylist}
                  onDelete={deletePlaylist}
                />
              )}

              {/* Favorites */}
              {favorites.length > 0 && (
                <ClipStrip
                  name="Favorites"
                  tag="_favorites"
                  count={favorites.length}
                  clips={favorites}
                  onPreview={handlePreview}
                  onShowJulian={handleShowJulian}
                />
              )}

              {/* API categories */}
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <ClipStrip
                    key={cat.tag}
                    name={cat.name}
                    tag={cat.tag}
                    count={cat.count}
                    clips={cat.clips}
                    onPreview={handlePreview}
                    onShowJulian={handleShowJulian}
                  />
                ))
              ) : (
                // Only show empty state if there are no personal strips either
                recentClips.length === 0 &&
                  favorites.length === 0 &&
                  playlists.length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-lg font-medium text-muted-foreground">
                        What would you like to say to Julian?
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground/70">
                        Type a phrase above to find the right clip
                      </p>
                    </div>
                  )
              )}
            </div>
          )}
        </main>
      </div>

      {/* Clip suggestions — after adding to queue */}
      {!previewClip && <ClipSuggestions />}

      {/* Video Preview — bottom sheet */}
      {previewClip && (
        <VideoPreview
          clip={previewClip}
          isFavorited={favoriteIds.has(previewClip.scene_id)}
          onToggleFavorite={() => toggleFavorite(previewClip)}
          onClose={() => setPreviewClip(null)}
          onShowJulian={() => handleShowJulian(previewClip)}
        />
      )}
    </>
  );
}
