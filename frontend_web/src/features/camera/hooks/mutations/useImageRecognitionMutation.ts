import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  uploadCapturedImageToServer,
  uploadChatFoodImageFeedback,
  uploadChatNutritionLabelImageFeedback,
  uploadMenuBoardImage,
  uploadNutritionLabelImage,
} from "@/features/camera/api/uploadCapturedImage.api";
import { refetchAndResolveChatHistoryItem } from "@/features/chat/hooks/queries/chatHistoryCache";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useCreateMealRecordByFoodImageMutation(callbacks?: UseMutationCallback) {
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

export function useCreateMenuByNutritionLabelImageMutation(callbacks?: UseMutationCallback) {
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

export function useRecommendMenusByMenuBoardImageMutation(callbacks?: UseMutationCallback) {
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

export function useCreateMealFeedbackByFoodImageMutation(callbacks?: UseMutationCallback) {
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

export function useGetFeedbackByNutritionLabelImageMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: Parameters<typeof uploadChatFoodImageFeedback>[0]) => {
      await uploadChatNutritionLabelImageFeedback(image);
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
