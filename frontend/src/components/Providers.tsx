"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { QueueProvider } from "@/lib/queue-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <QueueProvider>{children}</QueueProvider>
    </QueryClientProvider>
  );
}
