import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys as calendarQueryKeys } from "@/features/calendar/hooks/queries/calendar.queryKey";
import { queryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import {
  deleteTodayMealRecord,
  postTodayMealRecordRegister,
} from "@/features/meal-record/api/DayMeal";
import { menuQueryKeys } from "@/features/meal-record/hooks/queries/menuCache";
import {
  type MealServingInputMode,
  type MealTime,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import type { RegisterMealRequestDto } from "@/shared/api/types/api.request.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

function invalidateMealRecordRelatedQueries(queryClient: QueryClient, date: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dayMeals.byDate(date) }),
    queryClient.invalidateQueries({ queryKey: calendarQueryKeys.recordedDates.all }),
    queryClient.invalidateQueries({ queryKey: menuQueryKeys.frequentlyRecorded() }),
  ]);
}

export function useTodayMealRecordRegisterMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postTodayMealRecordRegister,
    onSuccess: async (_data, variables) => {
      await invalidateMealRecordRelatedQueries(queryClient, variables.date);
      callbacks?.onSuccess?.();
    },
    onError: async (error, variables) => {
      await invalidateMealRecordRelatedQueries(queryClient, variables.date);
      callbacks?.onError?.(error);
    },
  });
}

export function useTodayMealRecordDeleteMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodayMealRecord,
    onSuccess: async (_data, variables) => {
      await invalidateMealRecordRelatedQueries(queryClient, variables.date);
      callbacks?.onSuccess?.();
    },
    onError: async (error, variables) => {
      await invalidateMealRecordRelatedQueries(queryClient, variables.date);
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

      if (typeof request.meal_time === "string" && request.meal_time.trim().length > 0) {
        snapshot.meal_time = request.meal_time;
      }

      try {
        for (const menu of menusByTime) {
          await deleteTodayMealRecord({
            date: request.date,
            time: request.time,
            menu_id: menu.id,
          });
        }

        await invalidateMealRecordRelatedQueries(queryClient, dateKey);
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

        await invalidateMealRecordRelatedQueries(queryClient, dateKey);

        return rollbackSucceeded
          ? DELETE_MEAL_RECORD_RESULT.FAILED_RECOVERED
          : DELETE_MEAL_RECORD_RESULT.FAILED_UNRECOVERED;
      }
    },
  });
}
