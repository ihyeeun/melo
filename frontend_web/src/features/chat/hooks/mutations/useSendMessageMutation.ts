import { useMutation } from "@tanstack/react-query";

import {
  parseMenusFromText,
  registerMenuByNutritionLabelImageFeedback,
  searchMenu,
  sendMessage,
} from "@/features/chat/api/chat.api";
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

export function useRegisterMenuByNutritionLabelImageMutation(
  options?: UseSendMessageMutationOptions,
) {
  return useMutation({
    mutationFn: registerMenuByNutritionLabelImageFeedback,
    onSuccess: () => {
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    },
  });
}

export function useParseMenusFromTextMutation(options?: UseSendMessageMutationOptions) {
  return useMutation({
    mutationFn: parseMenusFromText,
    onSuccess: () => {
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    },
  });
}

export function useSearchMenuMutation(options?: UseSendMessageMutationOptions) {
  return useMutation({
    mutationFn: searchMenu,
    onSuccess: () => {
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    },
  });
}
