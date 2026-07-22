import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import {
  menuQueryKeys,
  patchMenuDetailCache,
} from "@/features/meal-record/hooks/queries/menuCache";
import { modifyNutrient, registerMenu } from "@/features/nutrient-entry/api/nutrient";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useRegisterMenuMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerMenu,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuQueryKeys.registered(),
        refetchType: "active",
      });
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
      await queryClient.cancelQueries({ queryKey: menuQueryKeys.detail(variables.id) });
      patchMenuDetailCache(queryClient, {
        id: variables.id,
        name: variables.name,
        brand: variables.brand,
        unit: variables.unit,
        weight: variables.weight,
        calories: variables.calories,
      });
      await queryClient.invalidateQueries({
        queryKey: menuQueryKeys.detail(variables.id),
        refetchType: "active",
      });
      await queryClient.invalidateQueries({
        queryKey: menuQueryKeys.registered(),
        refetchType: "active",
      });

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
