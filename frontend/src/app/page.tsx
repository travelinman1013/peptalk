"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Loader2, ChevronDown } from "lucide-react";
import { searchClips, browseCategories, ClipResult, BrowseClip } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { ClipGrid } from "@/components/ClipGrid";
import { ClipStrip } from "@/components/ClipStrip";
import { VideoPreview } from "@/components/VideoPreview";
import { JulianPlayer } from "@/components/JulianPlayer";
import { QueueStrip } from "@/components/QueueStrip";
import { PlaylistStrip } from "@/components/PlaylistStrip";
import { SkeletonStrip, SkeletonGrid } from "@/components/Skeletons";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { useRecentlyUsed } from "@/lib/hooks/use-recently-used";
import { usePlaylists } from "@/lib/hooks/use-playlists";
import { useQueue } from "@/lib/queue-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HelpMenu } from "@/components/HelpMenu";
import { HiddenClipsSheet } from "@/components/HiddenClipsSheet";
import { ClipSuggestions } from "@/components/ClipSuggestions";
import { BrowseFilters } from "@/components/BrowseFilters";
import { useHidden } from "@/lib/hooks/use-hidden";

export default function Home() {
  const [query, setQuery] = useState("");
  const [previewClip, setPreviewClip] = useState<ClipResult | BrowseClip | null>(null);
  const [julianClips, setJulianClips] = useState<(ClipResult | BrowseClip)[]>([]);
  const [showHiddenSheet, setShowHiddenSheet] = useState(false);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTopK, setSearchTopK] = useState(12);

  // Persistence hooks
  const { favorites, favoriteIds, toggleFavorite } = useFavorites();
  const { recentClips, recordUsage } = useRecentlyUsed(20);
  const { playlists, savePlaylist, deletePlaylist, markPlayed } = usePlaylists();
  const { queue, clearQueue } = useQueue();
  const { hiddenCount, hideClip, isHidden } = useHidden();

  // Search results
  const { data: searchData, isLoading: searchLoading, isError: searchError, isFetching: searchFetching, refetch: refetchSearch } = useQuery({
    queryKey: ["search", query, searchTopK],
    queryFn: () => searchClips(query, searchTopK),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });

  // Browse categories (load on mount, filtered)
  const { data: browseData, isLoading: browseLoading, isError: browseError, isFetching: browseFetching, refetch: refetchBrowse } = useQuery({
    queryKey: ["browse", {
      seasons: [...selectedSeasons].sort(),
      tags: [...selectedTags].sort(),
    }],
    queryFn: () => browseCategories({
      seasons: selectedSeasons.length > 0 ? selectedSeasons : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const searchResults = searchData?.groups?.[0]?.results ?? [];
  const categories = browseData?.categories ?? [];
  const availableSeasons = browseData?.available_seasons ?? [];
  const availableTags = browseData?.available_tags ?? [];
  const hasFilters = selectedSeasons.length > 0 || selectedTags.length > 0;

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setSearchTopK(12);
  }, []);

  const handlePreview = useCallback((clip: ClipResult | BrowseClip) => {
    setPreviewClip(clip);
  }, []);

  const handleShowJulian = useCallback((clip: ClipResult | BrowseClip) => {
    setPreviewClip(null);
    setJulianClips([clip]);
    recordUsage(clip);
  }, [recordUsage]);

  // Track whether to defer queue clearing until playback ends
  const deferQueueClear = useRef(false);

  const handlePlayQueue = useCallback(() => {
    if (queue.length === 0) return;
    setPreviewClip(null);
    setJulianClips([...queue]);
    for (const clip of queue) {
      recordUsage(clip);
    }
    // Defer clearing — JulianPlayer may be in AirPlay mini-bar mode
    // where Sam wants to keep browsing and managing the queue
    deferQueueClear.current = true;
  }, [queue, recordUsage]);

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
    if (deferQueueClear.current) {
      clearQueue();
      deferQueueClear.current = false;
    }
  }, [clearQueue]);

  const isLoadingMore = searchFetching && !searchLoading;
  const canShowMore = isLoadingMore || (searchResults.length >= searchTopK && searchTopK < 60);
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
        <header className="sticky top-0 z-30 bg-background/90 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-[0_1px_3px_0_rgb(0_0_0/0.08)] backdrop-blur-xl dark:shadow-[0_1px_3px_0_rgb(0_0_0/0.3)]">
          <div className="mx-auto max-w-2xl">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="absolute left-0">
                <HelpMenu hiddenCount={hiddenCount} onShowHidden={() => setShowHiddenSheet(true)} />
              </div>
              <h1 className="font-heading text-xl font-extrabold tracking-tight">
                <span className="text-primary">Pep</span>Talk
              </h1>
              <div className="absolute right-0">
                <ThemeToggle />
              </div>
            </div>
            <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
          </div>
        </header>

        {/* Queue strip — below header */}
        <QueueStrip onPlayAll={handlePlayQueue} onSavePlaylist={handleSavePlaylist} />

        {/* Content */}
        <main className="flex-1 px-4 py-5 sm:px-6">
          {isSearching ? (
            /* Search results */
            <div className="mx-auto max-w-2xl animate-content-enter">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {searchLoading ? "Searching..." : `${searchResults.length} results`}
                </span>
                {!searchLoading && (
                  <span className="rounded-lg bg-muted px-2 py-0.5 text-sm font-semibold">
                    {query}
                  </span>
                )}
              </div>
              {searchError ? (
                <div className="rounded-2xl border border-destructive/10 bg-destructive/5 p-6 text-center">
                  <svg className="mx-auto mb-3 text-destructive" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="text-sm font-medium text-destructive">Something went wrong</p>
                  <button
                    onClick={() => refetchSearch()}
                    className="mt-3 rounded-xl bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Try again
                  </button>
                </div>
              ) : searchLoading ? (
                <SkeletonGrid />
              ) : (
                <>
                  <ClipGrid
                    clips={searchResults}
                    onPreview={handlePreview}
                    onShowJulian={handleShowJulian}
                  />
                  {canShowMore && (
                    <button
                      onClick={() => setSearchTopK(prev => Math.min(prev + 12, 60))}
                      disabled={searchFetching}
                      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-muted font-semibold text-sm text-foreground transition-colors hover:bg-muted/80 disabled:opacity-60"
                    >
                      {searchFetching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Show more
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Category browse */
            <div className="animate-content-enter space-y-8">
              {/* Filters */}
              <BrowseFilters
                availableSeasons={availableSeasons}
                availableTags={availableTags}
                selectedSeasons={selectedSeasons}
                selectedTags={selectedTags}
                onSeasonsChange={setSelectedSeasons}
                onTagsChange={setSelectedTags}
              />

              {/* Recently Used */}
              {recentClips.length > 0 && !hasFilters && (
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
              {playlists.length > 0 && !hasFilters && (
                <PlaylistStrip
                  playlists={playlists}
                  onPlay={handlePlayPlaylist}
                  onDelete={deletePlaylist}
                />
              )}

              {/* Favorites */}
              {favorites.length > 0 && !hasFilters && (
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
              {browseError ? (
                <div className="rounded-2xl border border-destructive/10 bg-destructive/5 p-6 text-center">
                  <p className="text-sm font-medium text-destructive">Couldn&apos;t load categories</p>
                  <button
                    onClick={() => refetchBrowse()}
                    className="mt-3 rounded-xl bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Try again
                  </button>
                </div>
              ) : browseLoading ? (
                <>
                  <SkeletonStrip />
                  <SkeletonStrip />
                  <SkeletonStrip />
                </>
              ) : categories.length > 0 ? (
                <div className={`space-y-8 transition-opacity ${browseFetching && !browseLoading ? "opacity-60" : ""}`}>
                  {categories.map((cat) => (
                    <ClipStrip
                      key={cat.tag}
                      name={cat.name}
                      tag={cat.tag}
                      count={cat.count}
                      clips={cat.clips}
                      onPreview={handlePreview}
                      onShowJulian={handleShowJulian}
                    />
                  ))}
                </div>
              ) : hasFilters ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    No clips match these filters
                  </p>
                  <button
                    onClick={() => { setSelectedSeasons([]); setSelectedTags([]); }}
                    className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                // Only show empty state if there are no personal strips either
                recentClips.length === 0 &&
                  favorites.length === 0 &&
                  playlists.length === 0 && (
                    <div className="py-20 flex flex-col items-center gap-3 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <svg className="text-primary" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                      </div>
                      <p className="font-heading text-lg font-bold text-foreground">
                        Welcome to PepTalk
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Type what you&apos;d like to say to Julian and we&apos;ll find the perfect clip
                      </p>
                      <svg className="mt-2 animate-bounce text-muted-foreground/40" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    </div>
                  )
              )}
            </div>
          )}
        </main>
      </div>

      {/* Clip suggestions — after adding to queue */}
      {!previewClip && <ClipSuggestions />}

      {/* Hidden Clips management sheet */}
      {showHiddenSheet && (
        <HiddenClipsSheet onClose={() => setShowHiddenSheet(false)} />
      )}

      {/* Video Preview — bottom sheet */}
      {previewClip && (
        <VideoPreview
          clip={previewClip}
          isFavorited={favoriteIds.has(previewClip.scene_id)}
          isHidden={isHidden(previewClip.scene_id)}
          onToggleFavorite={() => toggleFavorite(previewClip)}
          onHide={() => {
            hideClip(previewClip.scene_id);
            setPreviewClip(null);
          }}
          onClose={() => setPreviewClip(null)}
          onShowJulian={() => handleShowJulian(previewClip)}
        />
      )}
    </>
  );
}
