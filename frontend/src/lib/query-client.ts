"use client";

import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 24 * 60 * 60 * 1000, // 24 hours
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}
