import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  uploadCapturedImageToServer,
  uploadChatFoodImageFeedback,
  uploadMenuBoardImage,
  uploadNutritionLabelImage,
} from "@/features/camera/api/uploadCapturedImage";
import { refetchAndResolveChatHistoryItem } from "@/features/chat/hooks/queries/chatHistoryCache";
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
    mutationFn: async (image: Parameters<typeof uploadMenuBoardImage>[0]) => {
      await uploadMenuBoardImage(image);
      const chatItem = await refetchAndResolveChatHistoryItem(queryClient);

      return {
        chatItem,
      };
    },
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

export function useChatFoodImageFeedbackMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: Parameters<typeof uploadChatFoodImageFeedback>[0]) => {
      await uploadChatFoodImageFeedback(image);
      const chatItem = await refetchAndResolveChatHistoryItem(queryClient);

      return {
        chatItem,
      };
    },
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
