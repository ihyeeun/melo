import { useMutation } from "@tanstack/react-query";

import {
  uploadCapturedImageToServer,
  uploadNutritionLabelImage,
} from "@/features/camera/api/uploadCapturedImage.api";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";

type CapturedImage = Parameters<typeof uploadCapturedImageToServer>[0];

function useImageAnalysisMutation<T>(analyze: (image: CapturedImage) => Promise<T>) {
  return useMutation({
    mutationFn: (image: CapturedImage) => captureScreenRequestScope().run(() => analyze(image)),
  });
}

export function useCreateMealRecordByFoodImageMutation() {
  return useImageAnalysisMutation(uploadCapturedImageToServer);
}

export function useCreateMenuByNutritionLabelImageMutation() {
  return useImageAnalysisMutation(uploadNutritionLabelImage);
}
