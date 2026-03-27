"use client";

import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getAllFavorites, addFavorite, removeFavorite } from "@/lib/db";
import type { ClipResult, BrowseClip } from "@/lib/api";

export function useFavorites() {
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: getAllFavorites,
    staleTime: Infinity,
  });

  const favoriteIds = new Set(favorites.map((f) => f.scene_id));

  const addMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const toggleFavorite = useCallback(
    (clip: ClipResult | BrowseClip) => {
      if (favoriteIds.has(clip.scene_id)) {
        removeMutation.mutate(clip.scene_id);
      } else {
        addMutation.mutate(clip);
      }
    },
    [favoriteIds, addMutation, removeMutation]
  );

  return { favorites, favoriteIds, isLoading, toggleFavorite };
}
