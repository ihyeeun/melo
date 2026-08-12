import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  deleteTodayWorkoutRecord,
  upsertWorkoutRecord,
} from "@/features/health/api/health-record.api";
import { workoutKeys } from "@/features/health/hooks/queries/workout.query";
import type { UpsertWorkoutRecordRequestDto } from "@/shared/api/types/api.request.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useUpsertWorkoutRecordMutation(callback?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body }: { date: string; body: UpsertWorkoutRecordRequestDto }) =>
      upsertWorkoutRecord(body),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: workoutKeys.records.byDate(variables.date),
      });

      callback?.onSuccess?.();
    },
    onError: (error) => {
      callback?.onError?.(error);
    },
  });
}

export function useDeleteWorkoutRecordMutation(callback?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodayWorkoutRecord,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: workoutKeys.records.byDate(variables.date),
      });

      callback?.onSuccess?.();
    },
    onError: (error) => {
      callback?.onError?.(error);
    },
  });
}
