import { useMutation } from "@tanstack/react-query";

import { postMealSearch } from "@/features/search/menu-record/api/mealSearch.api";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useMealSearchMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: postMealSearch,
    onSuccess: (data) => {
      return data;
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
