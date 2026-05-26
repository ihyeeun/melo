import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage } from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useSendMessageMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatHistory,
        refetchType: "active",
      });

      if (callbacks?.onSuccess) callbacks.onSuccess();
    },
    onError: (error) => {
      if (callbacks?.onError) callbacks.onError(error);
    },
  });
}
