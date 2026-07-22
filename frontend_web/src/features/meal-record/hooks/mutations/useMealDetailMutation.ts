import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteMeal } from "@/features/meal-record/api/mealDetail";
import { menuQueryKeys } from "@/features/meal-record/hooks/queries/menuCache";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useMealDeleteMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuQueryKeys.registered() });
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}
