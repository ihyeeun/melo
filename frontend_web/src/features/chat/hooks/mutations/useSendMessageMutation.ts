import { useMutation } from "@tanstack/react-query";

import { sendMessage } from "@/features/chat/api/chat.api";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

type UseSendMessageMutationOptions = UseMutationCallback;

export function useSendMessageMutation(options?: UseSendMessageMutationOptions) {
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    },
  });
}
