import { useMutation, useMutationState } from "@tanstack/react-query";

import {
  parseMenusFromText,
  registerMenuByNutritionLabelImageFeedback,
  sendMessage,
} from "@/features/chat/api/chat.api";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

const chatMutationKeys = {
  all: ["chat"] as const,
  message: () => [...chatMutationKeys.all, "message"] as const,
};

export function useSendMessageMutation(options?: UseMutationCallback) {
  return useMutation({
    mutationKey: chatMutationKeys.message(),
    mutationFn: sendMessage,
    onSuccess: () => {
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
      return {
        messageType: "pending" as const,
        key: `send:${mutation.mutationId}`,
        inputText: value.input,
        submittedAt: mutation.state.submittedAt,
      };
    },
  });

  return sendingMessage.map(({ submittedAt, ...message }) => ({
    ...message,
    date: new Date(submittedAt),
  }));
}
