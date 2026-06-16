import { useMutation, useQueryClient } from "@tanstack/react-query";

import { registerStep, registerWeight } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { updateWeight } from "@/features/profile/api/profile";
import type { WeightStepsResponseDto } from "@/shared/api/types/api.response.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

export function useRegisterWeightMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, weight }: { date: string; weight: number }) => {
      await registerWeight({ date, weight });

      if (date !== getTodayFormatDateKey()) {
        return undefined;
      }

      try {
        return await updateWeight(weight);
      } catch {
        return undefined;
      }
    },
    onSuccess: (_, { date, weight }) => {
      queryClient.setQueryData<WeightStepsResponseDto>(
        homeQueryKeys.bodyStats(date),
        (previous) => ({
          weight,
          steps: previous?.steps ?? null,
        }),
      );
      callbacks?.onSuccess?.();
    },
    onError: (error) => callbacks?.onError?.(error),
  });
}

export function useRegisterStepsMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, steps }: { date: string; steps: number }) => registerStep({ date, steps }),
    onSuccess: (_, { date, steps }) => {
      queryClient.setQueryData<WeightStepsResponseDto>(
        homeQueryKeys.bodyStats(date),
        (previous) => ({
          weight: previous?.weight ?? null,
          steps,
        }),
      );
      callbacks?.onSuccess?.();
    },
    onError: (error) => callbacks?.onError?.(error),
  });
}
