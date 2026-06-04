import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys as calendarQueryKeys } from "@/features/calendar/hooks/queries/queryKey";
import { queryKeys } from "@/features/home/hooks/queries/queryKey";
import {
  deleteTodayMealRecord,
  postTodayMealRecordRegister,
} from "@/features/meal-record/api/DayMeal";
import {
  type RecommendMenuAnalyticsItem,
  trackRecommendMenuCancel,
} from "@/shared/analytics/recommendMenuEvents";
import {
  type MealServingInputMode,
  type MealTime,
  MENU_INPUT_MODE,
  type RegisterMealRequestDto,
} from "@/shared/api/types/api.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

type MealRecordMutationAnalytics = {
  recommendMenuCancel?: RecommendMenuAnalyticsItem[];
};

type RegisterMealMutationParams = RegisterMealRequestDto & {
  analytics?: MealRecordMutationAnalytics;
};

function trackMutationAnalytics(analytics?: MealRecordMutationAnalytics) {
  if (analytics?.recommendMenuCancel?.length) {
    trackRecommendMenuCancel(analytics.recommendMenuCancel);
  }
}

export function useTodayMealRecordRegisterMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: RegisterMealMutationParams) => {
      const { analytics, ...request } = variables;
      void analytics;
      return postTodayMealRecordRegister(request);
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(variables.date) }),
        queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all }),
      ]);
      trackMutationAnalytics(variables.analytics);
      callbacks?.onSuccess?.();
    },
    onError: async (error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(variables.date) }),
        queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all }),
      ]);
      callbacks?.onError?.(error);
    },
  });
}

export function useTodayMealRecordDeleteMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodayMealRecord,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(variables.date) }),
        queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all }),
      ]);
      callbacks?.onSuccess?.();
    },
    onError: async (error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(variables.date) }),
        queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all }),
      ]);
      callbacks?.onError?.(error);
    },
  });
}

type MenuSnapshot = {
  id: number;
  quantity: number;
  serving_input_mode?: MealServingInputMode;
  mode?: MealServingInputMode;
};

type DeleteWithRollbackParams = {
  dateKey: string;
  request: RegisterMealRequestDto;
  currentMenusByTime: Record<MealTime, MenuSnapshot[]>;
  analytics?: MealRecordMutationAnalytics;
};

export const DELETE_MEAL_RECORD_RESULT = {
  DELETED: "deleted",
  FAILED_RECOVERED: "failed_recovered",
  FAILED_UNRECOVERED: "failed_unrecovered",
} as const;

export type DeleteMealRecordResult =
  (typeof DELETE_MEAL_RECORD_RESULT)[keyof typeof DELETE_MEAL_RECORD_RESULT];

export function useTodayMealRecordDeleteWithRollbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dateKey,
      request,
      currentMenusByTime,
    }: DeleteWithRollbackParams): Promise<DeleteMealRecordResult> => {
      const menusByTime = currentMenusByTime[request.time];
      const snapshot: RegisterMealRequestDto = {
        date: request.date,
        time: request.time,
        menu_ids: menusByTime.map((menu) => menu.id),
        menu_quantities: menusByTime.map((menu) => menu.quantity),
        menu_input_modes: menusByTime.map((menu) =>
          (menu.serving_input_mode ?? menu.mode) === "unit"
            ? MENU_INPUT_MODE.UNIT
            : MENU_INPUT_MODE.WEIGHT,
        ),
      };

      if (typeof request.image === "string" && request.image.trim().length > 0) {
        snapshot.image = request.image;
      }

      try {
        for (const menu of menusByTime) {
          await deleteTodayMealRecord({
            date: request.date,
            time: request.time,
            menu_id: menu.id,
          });
        }

        await queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(dateKey) });
        await queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all });
        return DELETE_MEAL_RECORD_RESULT.DELETED;
      } catch {
        let rollbackSucceeded = true;

        try {
          if ((snapshot.menu_ids?.length ?? 0) > 0) {
            await postTodayMealRecordRegister(snapshot);
          }
        } catch {
          rollbackSucceeded = false;
        }

        await queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(dateKey) });
        await queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all });

        return rollbackSucceeded
          ? DELETE_MEAL_RECORD_RESULT.FAILED_RECOVERED
          : DELETE_MEAL_RECORD_RESULT.FAILED_UNRECOVERED;
      }
    },
    onSuccess: (_deleteResult, variables) => {
      trackMutationAnalytics(variables.analytics);
    },
  });
}
