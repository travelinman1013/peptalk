"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  hideClip as hideClipApi,
  unhideClip as unhideClipApi,
  getHiddenClips,
} from "@/lib/api";

export function useHidden() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["hidden"],
    queryFn: getHiddenClips,
    staleTime: Infinity,
  });

  const hiddenCount = data?.count ?? 0;
  const hiddenIds = new Set((data?.clips ?? []).map((c) => c.scene_id));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["hidden"] });
    queryClient.invalidateQueries({ queryKey: ["search"] });
    queryClient.invalidateQueries({ queryKey: ["browse"] });
  };

  const hideMutation = useMutation({
    mutationFn: hideClipApi,
    onSuccess: invalidateAll,
  });

  const unhideMutation = useMutation({
    mutationFn: unhideClipApi,
    onSuccess: invalidateAll,
  });

  const hideClip = useCallback(
    (sceneId: string) => hideMutation.mutate(sceneId),
    [hideMutation]
  );

  const unhideClip = useCallback(
    (sceneId: string) => unhideMutation.mutate(sceneId),
    [unhideMutation]
  );

  const isHidden = useCallback(
    (sceneId: string) => hiddenIds.has(sceneId),
    [hiddenIds]
  );

  return { hiddenCount, hiddenIds, isLoading, hideClip, unhideClip, isHidden };
}
