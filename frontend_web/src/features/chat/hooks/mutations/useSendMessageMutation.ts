import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage } from "@/features/chat/api/chat.api";
import { appendMissingChatHistoryItemsToCache } from "@/features/chat/hooks/queries/chatHistoryCache";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import { isChatHistoryItemResponse } from "@/features/chat/utils/chatHistoryItem";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

type UseSendMessageMutationOptions = UseMutationCallback & {
  appendToCache?: boolean;
};

export function useSendMessageMutation(options?: UseSendMessageMutationOptions) {
  const queryClient = useQueryClient();
  const shouldAppendToCache = options?.appendToCache ?? true;

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (response) => {
      if (shouldAppendToCache && isChatHistoryItemResponse(response)) {
        appendMissingChatHistoryItemsToCache(queryClient, [response]);
      } else if (shouldAppendToCache) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory });
      }

      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    },
  });
}
