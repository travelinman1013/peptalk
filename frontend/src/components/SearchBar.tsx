"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [value, setValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (newValue.trim()) {
        debounceRef.current = setTimeout(() => onSearch(newValue.trim()), 300);
      }
    },
    [onSearch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onSearch(value.trim());
        inputRef.current?.blur();
      }
    },
    [value, onSearch]
  );

  const handleClear = useCallback(() => {
    setValue("");
    onSearch("");
    inputRef.current?.focus();
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      {/* Search icon */}
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder='What do you want to say? (e.g., "time for bed")'
        className="h-12 rounded-xl pl-10 pr-10 text-base"
        autoComplete="off"
        enterKeyHint="search"
        aria-label="Search for a clip to play"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Clear search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {isLoading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      )}
    </form>
  );
}
