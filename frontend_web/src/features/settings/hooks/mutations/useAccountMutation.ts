import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logout, withdraw } from "@/features/settings/api/account";
import { resetAnalyticsIdentity } from "@/shared/analytics/analytics";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

const TARGETS_STORAGE_KEY = "targets";

function clearClientSession(queryClient: QueryClient) {
  queryClient.clear();
  resetAnalyticsIdentity();

  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(TARGETS_STORAGE_KEY);
  } catch {
    // no-op
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // no-op
  }
}

export function useLogoutMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearClientSession(queryClient);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useWithdrawMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: withdraw,
    onSuccess: () => {
      clearClientSession(queryClient);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
