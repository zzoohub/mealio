import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance for React Query.
 * Lives in shared layer so features can access it without
 * violating FSD import rules (features cannot import from app).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: 1,
    },
  },
});

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

export interface PrefetchQuery {
  key: string[];
  fetcher: () => Promise<unknown>;
  staleTime?: number;
}

// Prefetch queue storage
const prefetchQueue = new Map<string, Promise<unknown>>();

export async function prefetchData(
  key: string[],
  fetcher: () => Promise<unknown>,
  staleTime?: number,
): Promise<unknown> {
  const keyStr = JSON.stringify(key);

  if (prefetchQueue.has(keyStr)) {
    return prefetchQueue.get(keyStr);
  }

  const promise = queryClient.prefetchQuery({
    queryKey: key,
    queryFn: fetcher,
    staleTime: staleTime || 1000 * 60 * 5,
  });

  prefetchQueue.set(keyStr, promise);

  promise.finally(() => {
    prefetchQueue.delete(keyStr);
  });

  return promise;
}

export async function prefetchBatch(queries: PrefetchQuery[]): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled(queries.map((q) => prefetchData(q.key, q.fetcher, q.staleTime)));
}
