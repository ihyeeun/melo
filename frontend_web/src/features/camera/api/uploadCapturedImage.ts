import { requestNativeImageUpload } from "@/shared/api/bridge/nativeBridge";
import {
  type CapturedImage,
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
};

export async function uploadCapturedImageToServer(capturedImage: CapturedImage) {
  const response = await requestNativeImageUpload<ApiResponse<FoodImageRecognitionResponseDto>>({
    endpoint: END_POINT.FOOD_ANALYSIS,
    fileUri: capturedImage.uri,
    fileName: capturedImage.fileName,
    mimeType: capturedImage.mimeType,
    fieldName: "image",
    method: "POST",
  });

  if (!isApiSuccess(response)) {
    const error = new Error(response.message ?? "음식 이미지 분석 실패");
    Object.assign(error, response);
    throw error;
  }

  return response.data;
}

export async function uploadNutritionLabelImage(capturedImage: CapturedImage) {
  const response = await requestNativeImageUpload<
    ApiResponse<NutritionLabelRecognitionResponseDto>
  >({
    endpoint: END_POINT.NUTRIENT_RECOGNITION,
    fileUri: capturedImage.uri,
    fileName: capturedImage.fileName,
    mimeType: capturedImage.mimeType,
    fieldName: "image",
    method: "POST",
  });

  if (!isApiSuccess(response)) {
    const error = new Error(response.message ?? "영양성분표 이미지 분석 실패");
    Object.assign(error, response);
    throw error;
  }

  return response.data;
}

export async function uploadMenuBoardImage(capturedImage: CapturedImage) {
  const response = await requestNativeImageUpload<ApiResponse<ChatMenuBoardRecommendResponseDto>>({
    endpoint: END_POINT.MENU_BOARD_ANALYSIS,
    fileUri: capturedImage.uri,
    fileName: capturedImage.fileName,
    mimeType: capturedImage.mimeType,
    fieldName: "image",
    method: "POST",
  });

  if (!isApiSuccess(response)) {
    const error = new Error(response.message ?? "메뉴판 분석 실패");
    Object.assign(error, response);
    throw error;
  }

  return response.data;
}
