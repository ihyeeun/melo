import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import { AppApiError } from "@/shared/api/appApi";

const NON_RETRYABLE_API_STATUS_CODES = new Set([401, 403, 408, 500, 502, 503, 504]);
const NON_RETRYABLE_API_ERROR_CODES = new Set(["NETWORK_ERROR", "REQUEST_TIMEOUT"]);
const BACKGROUND_REFETCH_THRESHOLD_MS = 10 * 60 * 1000;
const RESUME_REFETCH_DEBOUNCE_MS = 1000;

let lastResumeRefetchAt = 0;

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

function syncOnlineState() {
  if (typeof navigator === "undefined") return;

  onlineManager.setOnline(navigator.onLine);
}

function refetchActiveQueriesAfterResume(reason: string) {
  const now = Date.now();
  if (now - lastResumeRefetchAt < RESUME_REFETCH_DEBOUNCE_MS) return;
  lastResumeRefetchAt = now;

  focusManager.setFocused(true);
  syncOnlineState();

  void (async () => {
    try {
      await queryClient.resumePausedMutations();
      await queryClient.refetchQueries({ type: "active" }, { cancelRefetch: true });
    } catch (error) {
      console.error("[ReactQuery] resume refetch failed", {
        error,
        reason,
      });
    }
  })();
}

export function initQueryClientLifecycleSync() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  let backgroundedAt = document.visibilityState === "hidden" ? Date.now() : (null as number | null);

  const markBackgrounded = () => {
    backgroundedAt = Date.now();
    focusManager.setFocused(false);
  };

  const recoverAfterResume = (reason: string, options?: { force?: boolean }) => {
    const now = Date.now();
    const elapsedMs = backgroundedAt === null ? 0 : now - backgroundedAt;
    backgroundedAt = null;
    focusManager.setFocused(true);

    if (options?.force || elapsedMs >= BACKGROUND_REFETCH_THRESHOLD_MS) {
      refetchActiveQueriesAfterResume(reason);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      markBackgrounded();
      return;
    }

    recoverAfterResume("visibilitychange");
  };

  const handleFocus = () => {
    if (document.visibilityState === "hidden") return;
    recoverAfterResume("focus");
  };

  const handleOnline = () => {
    onlineManager.setOnline(true);
    refetchActiveQueriesAfterResume("online");
  };

  const handleOffline = () => {
    onlineManager.setOnline(false);
  };

  const handlePageShow = (event: PageTransitionEvent) => {
    recoverAfterResume("pageshow", { force: event.persisted });
  };

  const handleNativeAppResume = () => {
    refetchActiveQueriesAfterResume("native-app-resume");
  };

  syncOnlineState();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", markBackgrounded);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("native-app-resume", handleNativeAppResume);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", markBackgrounded);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("native-app-resume", handleNativeAppResume);
  };
}
