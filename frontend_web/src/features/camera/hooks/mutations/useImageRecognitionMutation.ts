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

type ImageFeedbackCallbacks = Omit<UseMutationCallback, "onSuccess"> & {
  onSuccess?: (streamChatId?: number) => void;
};

export function useCreateMealFeedbackByFoodImageMutation(callbacks?: ImageFeedbackCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadChatFoodImageFeedback,

    onSuccess: async () => {
      let streamChatId: number | undefined;
      try {
        const history = await queryClient.fetchQuery({
          queryKey: queryKeys.chatHistory,
          queryFn: getChatHistory,
          staleTime: 0,
        });

        streamChatId = history.chat_list[0].id;
      } catch {
        //
      }

      callbacks?.onSuccess?.(streamChatId);
    },

    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useGetFeedbackByNutritionLabelImageMutation(callbacks?: ImageFeedbackCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadChatNutritionLabelImageFeedback,

    onSuccess: async () => {
      let streamChatId: number | undefined;
      try {
        const history = await queryClient.fetchQuery({
          queryKey: queryKeys.chatHistory,
          queryFn: getChatHistory,
          staleTime: 0,
        });

        streamChatId = history.chat_list[0].id;
      } catch {
        //
      }

      callbacks?.onSuccess?.(streamChatId);
    },

    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
