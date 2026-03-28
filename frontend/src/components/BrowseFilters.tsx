"use client";

import { AvailableTag } from "@/lib/api";

interface BrowseFiltersProps {
  availableSeasons: number[];
  availableTags: AvailableTag[];
  selectedSeasons: number[];
  selectedTags: string[];
  onSeasonsChange: (seasons: number[]) => void;
  onTagsChange: (tags: string[]) => void;
}

export function BrowseFilters({
  availableSeasons,
  availableTags,
  selectedSeasons,
  selectedTags,
  onSeasonsChange,
  onTagsChange,
}: BrowseFiltersProps) {
  const hasFilters = selectedSeasons.length > 0 || selectedTags.length > 0;

  function toggleSeason(season: number) {
    if (selectedSeasons.includes(season)) {
      onSeasonsChange(selectedSeasons.filter((s) => s !== season));
    } else {
      onSeasonsChange([...selectedSeasons, season]);
    }
  }

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  }

  function clearAll() {
    onSeasonsChange([]);
    onTagsChange([]);
  }

  // Show top 8 category tags
  const displayTags = availableTags.slice(0, 8);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {/* Season pills */}
        {availableSeasons.map((season) => {
          const active = selectedSeasons.includes(season);
          return (
            <button
              key={`s${season}`}
              onClick={() => toggleSeason(season)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              S{season}
            </button>
          );
        })}

        {/* Divider */}
        {availableSeasons.length > 0 && displayTags.length > 0 && (
          <div className="mx-1 h-6 w-px shrink-0 bg-border" />
        )}

        {/* Category tag pills */}
        {displayTags.map(({ tag, label, count }) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}

        {/* Clear button */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
