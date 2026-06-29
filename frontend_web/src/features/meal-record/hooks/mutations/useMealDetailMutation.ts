import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteMeal } from "@/features/meal-record/api/mealDetail";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useMealDeleteMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registered-menus"] });
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}
