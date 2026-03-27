"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchClips, browseCategories, ClipResult, BrowseClip } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { ClipGrid } from "@/components/ClipGrid";
import { ClipStrip } from "@/components/ClipStrip";
import { VideoPreview } from "@/components/VideoPreview";
import { JulianPlayer } from "@/components/JulianPlayer";

export default function Home() {
  const [query, setQuery] = useState("");
  const [previewClip, setPreviewClip] = useState<ClipResult | BrowseClip | null>(null);
  const [julianClip, setJulianClip] = useState<ClipResult | BrowseClip | null>(null);

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
    setJulianClip(clip);
  }, []);

  const handleExitJulian = useCallback(() => {
    setJulianClip(null);
  }, []);

  const isSearching = query.length > 0;

  return (
    <>
      {/* Julian Player — fullscreen, no chrome */}
      {julianClip && (
        <JulianPlayer clip={julianClip} onExit={handleExitJulian} />
      )}

      {/* Main app */}
      <div className="flex min-h-[100dvh] flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 px-4 pb-3 pt-4 backdrop-blur-xl">
          <h1 className="mb-3 text-center text-lg font-bold tracking-tight">
            PepTalk
          </h1>
          <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
        </header>

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
                <div className="py-20 text-center">
                  <p className="text-lg font-medium text-muted-foreground">
                    What would you like to say to Julian?
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground/70">
                    Type a phrase above to find the right clip
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Video Preview — bottom sheet */}
      {previewClip && (
        <VideoPreview
          clip={previewClip}
          onClose={() => setPreviewClip(null)}
          onShowJulian={() => handleShowJulian(previewClip)}
        />
      )}
    </>
  );
}
