"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchClips, ClipResult } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { ClipGrid } from "@/components/ClipGrid";
import { VideoPreview } from "@/components/VideoPreview";
import { JulianPlayer } from "@/components/JulianPlayer";

export default function Home() {
  const [query, setQuery] = useState("");
  const [previewClip, setPreviewClip] = useState<ClipResult | null>(null);
  const [julianClip, setJulianClip] = useState<ClipResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchClips(query),
    enabled: query.length > 0,
  });

  const results = data?.groups?.[0]?.results ?? [];

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handlePreview = useCallback((clip: ClipResult) => {
    setPreviewClip(clip);
  }, []);

  const handleShowJulian = useCallback((clip: ClipResult) => {
    setPreviewClip(null);
    setJulianClip(clip);
  }, []);

  const handleExitJulian = useCallback(() => {
    setJulianClip(null);
  }, []);

  return (
    <>
      {/* Julian Player — fullscreen, no chrome */}
      {julianClip && (
        <JulianPlayer clip={julianClip} onExit={handleExitJulian} />
      )}

      {/* Main app */}
      <div className="flex min-h-[100dvh] flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 px-4 pb-3 pt-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
          <h1 className="mb-3 text-center text-xl font-bold text-gray-800 dark:text-white">
            PepTalk
          </h1>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-4">
          {query ? (
            <ClipGrid
              clips={results}
              onPreview={handlePreview}
              onShowJulian={handleShowJulian}
            />
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-gray-500">
                What would you like to say to Julian?
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Type a phrase below to find the right Peppa Pig clip
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Video Preview — bottom sheet for Sam */}
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
