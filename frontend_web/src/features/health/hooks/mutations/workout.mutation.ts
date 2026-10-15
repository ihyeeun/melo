import { useMutation, useQueryClient } from "@tanstack/react-query";

import { calendarKeys } from "@/features/calendar/hooks/queries/calendar.queryKey";
import {
  deleteTodayWorkoutRecord,
  upsertWorkoutRecord,
} from "@/features/health/api/health-record.api";
import { workoutKeys } from "@/features/health/hooks/queries/workout.query";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { UpsertWorkoutRecordRequestDto } from "@/shared/api/types/api.request.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useUpsertWorkoutRecordMutation(callback?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body }: { date: string; body: UpsertWorkoutRecordRequestDto }) =>
      upsertWorkoutRecord(body),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workoutKeys.records.byDate(variables.date) }),
        queryClient.invalidateQueries({
          queryKey: calendarKeys.monthly.month({ date: variables.date.slice(0, 7), mode: "workout" }),
        }),
      ]);

      callback?.onSuccess?.();
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      callback?.onError?.(error);
    },
  });
}

export function useDeleteWorkoutRecordMutation(callback?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodayWorkoutRecord,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workoutKeys.records.byDate(variables.date) }),
        queryClient.invalidateQueries({
          queryKey: calendarKeys.monthly.month({ date: variables.date.slice(0, 7), mode: "workout" }),
        }),
      ]);

      callback?.onSuccess?.();
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      callback?.onError?.(error);
    },
  });
}
