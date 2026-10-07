import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";

import {
  getChatHistory,
  parseMenusFromText,
  registerMenuByNutritionLabelImageFeedback,
  sendMessage,
} from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { ChatHistoryResponseDto } from "@/shared/api/types/api.response.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

const chatMutationKeys = {
  all: ["chat"] as const,
  message: () => [...chatMutationKeys.all, "message"] as const,
};

interface SendContext {
  previousChatIds: number[];
}

export function useSendMessageMutation(options?: UseMutationCallback) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: chatMutationKeys.message(),
    mutationFn: sendMessage,
    onMutate: (): SendContext => {
      const history = queryClient.getQueryData<ChatHistoryResponseDto>(queryKeys.chatHistory);

      return {
        previousChatIds: history?.chat_list.map((chat) => chat.id) ?? [],
      };
    },
    onSuccess: async () => {
      try {
        await queryClient.fetchQuery({
          queryKey: queryKeys.chatHistory,
          queryFn: getChatHistory,
          staleTime: 0,
        });
      } catch {
        //
      }
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      if (options?.onError) options.onError(error);
    },
  });
}

export function useRegisterMenuByNutritionLabelImageMutation(options?: UseMutationCallback) {
  return useMutation({
    mutationFn: registerMenuByNutritionLabelImageFeedback,
    onSuccess: () => {
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      if (options?.onError) options.onError(error);
    },
  });
}

export function useParseMenusFromTextMutation(options?: UseMutationCallback) {
  return useMutation({
    mutationFn: parseMenusFromText,
    onSuccess: () => {
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (isRequestAbortError(error)) return;
      if (options?.onError) options.onError(error);
    },
  });
}

export function usePendingSendMessages() {
  const sendingMessage = useMutationState({
    filters: {
      mutationKey: chatMutationKeys.message(),
      exact: true,
      status: "pending",
    },
    select: (mutation) => {
      const value = mutation.state.variables as {
        input: string;
      };

      const context = mutation.state.context as SendContext | undefined;

      return {
        messageType: "pending" as const,
        key: `send:${mutation.mutationId}`,
        inputText: value.input,
        submittedAt: mutation.state.submittedAt,
        previousChatIds: context?.previousChatIds,
      };
    },
  });

  return sendingMessage.map(({ submittedAt, ...message }) => ({
    ...message,
    date: new Date(submittedAt),
  }));
}
