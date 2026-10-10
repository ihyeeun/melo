import { useMutation } from "@tanstack/react-query";

import {
  uploadChatFoodImageFeedback,
  uploadChatNutritionLabelImageFeedback,
} from "@/features/camera/api/uploadCapturedImage.api";
import { MODE } from "@/features/camera/constants/camera.constant";
import type { CameraCaptureResponsePayload } from "@/shared/api/bridge/nativeBridge.types";
import type { ScreenRequestScope } from "@/shared/api/screenRequests";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

interface AnalyzeImageProps {
  image: CameraCaptureResponsePayload;
  screen: ScreenRequestScope;
}

export function useImageAnalysisMutation(callbacks?: UseMutationCallback) {
  return useMutation({
    mutationFn: ({ image, screen }: AnalyzeImageProps) =>
      screen.run(async () => {
        if (image.mode === MODE.FOOD) return uploadChatFoodImageFeedback(image);
        return uploadChatNutritionLabelImageFeedback(image);
      }),
    onSuccess: callbacks?.onSuccess,
    onError: callbacks?.onError,
  });
}
