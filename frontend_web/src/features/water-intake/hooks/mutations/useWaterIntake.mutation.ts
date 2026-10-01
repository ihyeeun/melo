import { useMutation, useQueryClient } from "@tanstack/react-query";

import { registerWaterCupSize, registerWaterIntake } from "@/features/water-intake/apis/water.api";
import { waterIntakeKeys } from "@/features/water-intake/constants/waterIntake.querykey";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useRegisterWaterIntakeMutation(callback: UseMutationCallback) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerWaterIntake,
    onSuccess: () => {
      if (callback?.onSuccess) callback.onSuccess();
      queryClient.invalidateQueries({ queryKey: waterIntakeKeys.all });
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      if (callback?.onError) return callback.onError(error);
    },
  });
}

export function useRegisterWaterCupSizeMutation(callback: UseMutationCallback) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerWaterCupSize,
    onSuccess: () => {
      if (callback?.onSuccess) callback.onSuccess();
      queryClient.invalidateQueries({ queryKey: waterIntakeKeys.all });
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      if (callback?.onError) return callback.onError(error);
    },
  });
}
