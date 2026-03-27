"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getAllPlaylists,
  savePlaylist,
  deletePlaylist,
  updatePlaylistUsage,
} from "@/lib/db";
import type { ClipResult, BrowseClip } from "@/lib/api";

export function usePlaylists() {
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: getAllPlaylists,
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: ({ name, clips }: { name: string; clips: (ClipResult | BrowseClip)[] }) =>
      savePlaylist(name, clips),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  const playMutation = useMutation({
    mutationFn: updatePlaylistUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  return {
    playlists,
    isLoading,
    savePlaylist: saveMutation.mutate,
    deletePlaylist: deleteMutation.mutate,
    markPlayed: playMutation.mutate,
  };
}
