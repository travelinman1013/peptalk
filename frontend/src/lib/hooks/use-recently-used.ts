"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getRecentlyUsed, recordUsage } from "@/lib/db";

export function useRecentlyUsed(limit: number = 20) {
  const queryClient = useQueryClient();

  const { data: recentClips = [], isLoading } = useQuery({
    queryKey: ["recently-used", limit],
    queryFn: () => getRecentlyUsed(limit),
    staleTime: Infinity,
  });

  const recordMutation = useMutation({
    mutationFn: recordUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recently-used"] });
    },
  });

  return {
    recentClips,
    isLoading,
    recordUsage: recordMutation.mutate,
  };
}
