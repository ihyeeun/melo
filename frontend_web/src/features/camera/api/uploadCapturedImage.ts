import { AppApiError, toAppApiError } from "@/shared/api/appApi";
import { requestNativeImageUpload } from "@/shared/api/bridge/nativeBridge";
import type { ImageUploadRequestPayload } from "@/shared/api/bridge/nativeBridge.types";
import {
  type CapturedImage,
  type ChatFoodImageFeedbackResponseDto,
  type ChatMenuBoardRecommendResponseDto,
  type FoodImageRecognitionResponseDto,
  type NutritionLabelRecognitionResponseDto,
} from "@/shared/api/types/api.dto";
import { type ApiResponse, isApiSuccess } from "@/shared/api/types/apiResponse.types";

const END_POINT = {
  IMAGE_UPLOAD: "/home/uploadMealImage",
  FOOD_ANALYSIS: "/home/recognizeFoodImage",
  NUTRIENT_RECOGNITION: "/home/recognizeNutritionLabel",
  MENU_BOARD_ANALYSIS: "/chat/menu-board",
  CHAT_FOOD_IMAGE_FEEDBACK: "/chat/food-image-feedback",
};

async function requestNativeImageUploadData<T>(
  payload: ImageUploadRequestPayload,
  fallbackMessage: string,
) {
  try {
    const response = await requestNativeImageUpload<ApiResponse<T>>(payload);

    if (!isApiSuccess(response)) {
      throw new AppApiError(response);
    }

    return response.data;
  } catch (error) {
    throw toAppApiError(error, fallbackMessage, "IMAGE_UPLOAD_REQUEST_FAILED");
  }
}

export async function uploadCapturedImageToServer(capturedImage: CapturedImage) {
  return requestNativeImageUploadData<FoodImageRecognitionResponseDto>(
    {
      endpoint: END_POINT.FOOD_ANALYSIS,
      fileUri: capturedImage.uri,
      fileName: capturedImage.fileName,
      mimeType: capturedImage.mimeType,
      fieldName: "image",
      method: "POST",
    },
    "음식 이미지 분석 실패",
  );
}

export async function uploadNutritionLabelImage(capturedImage: CapturedImage) {
  return requestNativeImageUploadData<NutritionLabelRecognitionResponseDto>(
    {
      endpoint: END_POINT.NUTRIENT_RECOGNITION,
      fileUri: capturedImage.uri,
      fileName: capturedImage.fileName,
      mimeType: capturedImage.mimeType,
      fieldName: "image",
      method: "POST",
    },
    "영양성분표 이미지 분석 실패",
  );
}

export async function uploadMenuBoardImage(capturedImage: CapturedImage) {
  return requestNativeImageUploadData<ChatMenuBoardRecommendResponseDto>(
    {
      endpoint: END_POINT.MENU_BOARD_ANALYSIS,
      fileUri: capturedImage.uri,
      fileName: capturedImage.fileName,
      mimeType: capturedImage.mimeType,
      fieldName: "image",
      method: "POST",
    },
    "메뉴판 분석 실패",
  );
}

export async function uploadChatFoodImageFeedback(image: CapturedImage) {
  return requestNativeImageUploadData<ChatFoodImageFeedbackResponseDto>(
    {
      endpoint: END_POINT.CHAT_FOOD_IMAGE_FEEDBACK,
      fileUri: image.uri,
      fileName: image.fileName,
      mimeType: image.mimeType,
      fieldName: "image",
      method: "POST",
    },
    "음식 분석 실패",
  );
}
