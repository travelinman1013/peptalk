"use client";

import { useMemo } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { getQueryClient } from "@/lib/query-client";
import { createIDBPersister } from "@/lib/query-persister";
import { QueueProvider } from "@/lib/queue-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const persister = useMemo(() => createIDBPersister(), []);

  const persistOptions = useMemo(
    () => ({
      persister,
      dehydrateOptions: {
        shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) =>
          query.queryKey[0] === "browse",
      },
    }),
    [persister]
  );

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <QueueProvider>{children}</QueueProvider>
    </PersistQueryClientProvider>
  );
}
