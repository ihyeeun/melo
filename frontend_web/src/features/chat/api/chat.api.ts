import { appApiData } from "@/shared/api/apiClient";
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
