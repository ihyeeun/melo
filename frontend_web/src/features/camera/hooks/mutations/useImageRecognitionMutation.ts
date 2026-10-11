import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  uploadCapturedImageToServer,
  uploadChatFoodImageFeedback,
  uploadChatNutritionLabelImageFeedback,
  uploadMenuBoardImage,
  uploadNutritionLabelImage,
} from "@/features/camera/api/uploadCapturedImage.api";
import { getChatHistory } from "@/features/chat/api/chat.api";
import { refetchAndResolveChatHistoryItem } from "@/features/chat/hooks/queries/chatHistoryCache";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

type CapturedImage = Parameters<typeof uploadCapturedImageToServer>[0];

function useImageAnalysisMutation<T>(analyze: (image: CapturedImage) => Promise<T>) {
  return useMutation({
    mutationFn: (image: CapturedImage) => captureScreenRequestScope().run(() => analyze(image)),
  });
}

async function analyzeAndSyncChat(
  analyze: (image: CapturedImage) => Promise<unknown>,
  image: CapturedImage,
  queryClient: QueryClient,
) {
  const screen = captureScreenRequestScope();
  await analyze(image);
  screen.assertActive();
  const chatItem = await refetchAndResolveChatHistoryItem(queryClient);
  return { chatItem };
}

export function useCreateMealRecordByFoodImageMutation() {
  return useImageAnalysisMutation(uploadCapturedImageToServer);
}

export function useCreateMenuByNutritionLabelImageMutation() {
  return useImageAnalysisMutation(uploadNutritionLabelImage);
}

export function useRecommendMenusByMenuBoardImageMutation() {
  const queryClient = useQueryClient();
  return useImageAnalysisMutation((image) =>
    analyzeAndSyncChat(uploadMenuBoardImage, image, queryClient),
  );
}

export function useCreateMealFeedbackByFoodImageMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadChatFoodImageFeedback,

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

      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useGetFeedbackByNutritionLabelImageMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadChatNutritionLabelImageFeedback,

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

      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
