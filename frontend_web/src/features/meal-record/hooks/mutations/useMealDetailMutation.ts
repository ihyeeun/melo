import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteMeal } from "@/features/meal-record/api/mealDetail";
import { menuQueryKeys } from "@/features/meal-record/hooks/queries/menuCache";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useMealDeleteMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuQueryKeys.lists(),
        refetchType: "active",
      });
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}
