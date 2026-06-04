import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys as calendarQueryKeys } from "@/features/calendar/hooks/queries/queryKey";
import { queryKeys } from "@/features/home/hooks/queries/queryKey";
import { postTodayMealRecordRegister } from "@/features/search/menu-record/api/todayMealRecord";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useTodayMealRecordRegisterMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postTodayMealRecordRegister,
    onSuccess: async (_, variables) => {
      if (callbacks?.onSuccess) callbacks.onSuccess();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(variables.date) }),
        queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all }),
      ]);
    },
    onError: (error) => {
      if (callbacks?.onError) callbacks.onError(error);
    },
  });
}
