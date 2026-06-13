import { useMutation, useQueryClient } from "@tanstack/react-query";

import { registerStep, registerWeight } from "@/features/home/api/health";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/queryKey";
import { updateWeight } from "@/features/profile/api/profile";
import { queryKeys as profileQueryKeys } from "@/features/profile/hooks/queries/queryKey";
import type {
  ProfileResponseDto,
  WeightStepsResponseDto,
} from "@/shared/api/types/api.response.dto";
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
    onSuccess: (updatedProfile, { date, weight }) => {
      queryClient.setQueryData<WeightStepsResponseDto>(
        homeQueryKeys.bodyStats(date),
        (previous) => ({
          weight,
          steps: previous?.steps ?? 0,
        }),
      );

      if (updatedProfile) {
        queryClient.setQueryData<ProfileResponseDto>(profileQueryKeys.profile, updatedProfile);
      }

      callbacks?.onSuccess?.();
    },
    onError: (error) => callbacks?.onError?.(error),
  });
}

export function useRegisterStepsMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, steps }: { date: string; steps: number }) => registerStep({ date, steps }),
    onSuccess: (_data, { date, steps }) => {
      queryClient.setQueryData<WeightStepsResponseDto>(
        homeQueryKeys.bodyStats(date),
        (previous) => ({
          weight: previous?.weight ?? 0,
          steps,
        }),
      );
      callbacks?.onSuccess?.();
    },
    onError: (error) => callbacks?.onError?.(error),
  });
}
