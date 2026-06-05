import { useMutation } from "@tanstack/react-query";

import { postRegisterUserInfo } from "@/features/onboarding/api/registerUserInfo";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";
import { useSetTargets } from "@/shared/stores/targetNutrient.store";

export function useRegisterUserInfoMutation(callbacks?: UseMutationCallback) {
  const setTargets = useSetTargets();

  return useMutation({
    mutationFn: postRegisterUserInfo,
    onSuccess: (data) => {
      setTargets({ target_calories: data.target_calories, target_ratio: data.target_ratio });
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
