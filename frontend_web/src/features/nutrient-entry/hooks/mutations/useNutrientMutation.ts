import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { modifyNutrient, registerMenu } from "@/features/nutrient-entry/api/nutrient";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useRegisterMenuMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: registerMenu,
    onSuccess: () => {
      if (callbacks?.onSuccess) callbacks.onSuccess();
    },
    onError: (error) => {
      if (callbacks?.onError) callbacks.onError(error);
    },
  });
}

export function useModifyNutrientMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modifyNutrient,
    onSuccess: async (_response, variables) => {
      await queryClient.cancelQueries({ queryKey: ["meal-detail", variables.id] });
      queryClient.removeQueries({ queryKey: ["meal-detail", variables.id] });
      await queryClient.invalidateQueries({
        queryKey: ["meal-detail", variables.id],
        refetchType: "active",
      });

      await queryClient.cancelQueries({ queryKey: queryKeys.dayMeals.all });
      queryClient.removeQueries({ queryKey: queryKeys.dayMeals.all });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dayMeals.all,
        refetchType: "active",
      });
      if (callbacks?.onSuccess) callbacks.onSuccess();
    },

    onError: (error) => {
      if (callbacks?.onError) callbacks.onError(error);
    },
  });
}
