import { useMutation } from "@tanstack/react-query";

import { postAuthorizeSubCode } from "@/features/onboarding/api/authorizeSubCode";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useAuthorizeSubCodeMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: postAuthorizeSubCode,
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      callbacks?.onError?.(error);
    },
  });
}
