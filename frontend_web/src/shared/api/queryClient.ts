import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { AppApiError } from "@/shared/api/appApi";

const NON_RETRYABLE_API_STATUS_CODES = new Set([401, 403, 408, 500, 502, 503, 504]);
const NON_RETRYABLE_API_ERROR_CODES = new Set([
  "NETWORK_ERROR",
  "REQUEST_TIMEOUT",
]);

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (error instanceof AppApiError) {
    return (
      !NON_RETRYABLE_API_STATUS_CODES.has(error.statusCode) &&
      !NON_RETRYABLE_API_ERROR_CODES.has(error.error) &&
      failureCount < 1
    );
  }

  return failureCount < 1;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("[ReactQuery] query failed", {
        error,
        queryKey: query.queryKey,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error("[ReactQuery] mutation failed", {
        error,
        mutationKey: mutation.options.mutationKey,
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
