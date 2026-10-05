import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  uploadCapturedImageToServer,
  uploadChatFoodImageFeedback,
  uploadChatNutritionLabelImageFeedback,
  uploadMenuBoardImage,
  uploadNutritionLabelImage,
} from "@/features/camera/api/uploadCapturedImage.api";
import { refetchAndResolveChatHistoryItem } from "@/features/chat/hooks/queries/chatHistoryCache";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";

type CapturedImage = Parameters<typeof uploadCapturedImageToServer>[0];

function useImageAnalysisMutation<T>(
  analyze: (image: CapturedImage) => Promise<T>,
) {
  return useMutation({
    mutationFn: (image: CapturedImage) =>
      captureScreenRequestScope().run(() => analyze(image)),
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
  return useImageAnalysisMutation(
    (image) => analyzeAndSyncChat(uploadMenuBoardImage, image, queryClient),
  );
}

export function useCreateMealFeedbackByFoodImageMutation() {
  const queryClient = useQueryClient();
  return useImageAnalysisMutation(
    (image) => analyzeAndSyncChat(uploadChatFoodImageFeedback, image, queryClient),
  );
}

export function useGetFeedbackByNutritionLabelImageMutation() {
  const queryClient = useQueryClient();
  return useImageAnalysisMutation(
    (image) => analyzeAndSyncChat(uploadChatNutritionLabelImageFeedback, image, queryClient),
  );
}
