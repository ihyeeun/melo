import { appApiData } from "@/shared/api/appApi";
import type { ChatHistoryResponseDto, ChatRecommendResponseDto } from "@/shared/api/types/api.dto";

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
    timeoutMs: 60000,
  });
  return response;
}
