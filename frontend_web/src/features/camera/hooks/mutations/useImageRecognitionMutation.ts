import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  uploadCapturedImageToServer,
  uploadChatFoodImageFeedback,
  uploadMenuBoardImage,
  uploadNutritionLabelImage,
} from "@/features/camera/api/uploadCapturedImage";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useFoodImageMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: uploadCapturedImageToServer,
    onSuccess: () => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}

export function useNutritionLabelMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: uploadNutritionLabelImage,
    onSuccess: () => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}

export function useMenuBoardMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMenuBoardImage,
    onSuccess: () => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory });
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}

export function useChatFoodImageFeedbackMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadChatFoodImageFeedback,
    onSuccess: () => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory });
    },
    onError: (error) => {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
    },
  });
}
