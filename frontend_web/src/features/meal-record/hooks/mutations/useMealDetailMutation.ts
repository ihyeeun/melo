import { useMutation } from "@tanstack/react-query";

import { deleteMeal } from "@/features/meal-record/api/mealDetail";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useMealDeleteMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}
