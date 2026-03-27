"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { ClipResult, BrowseClip } from "@/lib/api";

interface QueueContextValue {
  queue: (ClipResult | BrowseClip)[];
  lastAddedSceneId: string | null;
  addToQueue: (clip: ClipResult | BrowseClip) => void;
  removeFromQueue: (sceneId: string) => void;
  clearQueue: () => void;
  isInQueue: (sceneId: string) => boolean;
  queuePosition: (sceneId: string) => number;
  dismissSuggestions: () => void;
}

const QueueContext = createContext<QueueContextValue | null>(null);

const STORAGE_KEY = "peptalk-queue";

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(ClipResult | BrowseClip)[]>([]);
  const [lastAddedSceneId, setLastAddedSceneId] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // ignore quota errors
    }
  }, [queue]);

  const addToQueue = useCallback((clip: ClipResult | BrowseClip) => {
    setQueue((prev) => {
      // Deduplicate by scene_id
      if (prev.some((c) => c.scene_id === clip.scene_id)) return prev;
      return [...prev, clip];
    });
    setLastAddedSceneId(clip.scene_id);
  }, []);

  const dismissSuggestions = useCallback(() => {
    setLastAddedSceneId(null);
  }, []);

  const removeFromQueue = useCallback((sceneId: string) => {
    setQueue((prev) => prev.filter((c) => c.scene_id !== sceneId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const isInQueue = useCallback(
    (sceneId: string) => queue.some((c) => c.scene_id === sceneId),
    [queue]
  );

  const queuePosition = useCallback(
    (sceneId: string) => {
      const idx = queue.findIndex((c) => c.scene_id === sceneId);
      return idx === -1 ? -1 : idx + 1;
    },
    [queue]
  );

  return (
    <QueueContext value={{
      queue,
      lastAddedSceneId,
      addToQueue,
      removeFromQueue,
      clearQueue,
      isInQueue,
      queuePosition,
      dismissSuggestions,
    }}>
      {children}
    </QueueContext>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}
