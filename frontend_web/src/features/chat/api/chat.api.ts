import { appApiData } from "@/shared/api/apiClient";
import type { NutritionLabelMenuRegisterRequestDto } from "@/shared/api/types/api.request.dto";
import type {
  ChatHistoryResponseDto,
  ChatRecommendResponseDto,
} from "@/shared/api/types/api.response.dto";

export async function getChatHistory() {
  const response = await appApiData<ChatHistoryResponseDto>({
    endpoint: "/chat/history",
    method: "GET",
  });

  return response;
}

export async function sendMessage({ input }: { input: string }) {
  const response = await appApiData<ChatRecommendResponseDto>({
    endpoint: "/chat/recommend",
    method: "POST",
    body: { input },
    timeoutMs: 5 * 60 * 1000,
  });
  return response;
}

export async function registerMenuByNutritionLabelImageFeedback({
  body,
}: {
  body: NutritionLabelMenuRegisterRequestDto;
}) {
  const response = await appApiData<number>({
    endpoint: "/chat/nutrition-label-feedback/register-menu",
    method: "POST",
    body,
  });

  return response;
}
