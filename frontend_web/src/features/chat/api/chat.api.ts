import { appApiData } from "@/shared/api/appApi";
import type {
  ChatHistoryItemResponseDto,
  ChatHistoryResponseDto,
  ChatRecommendResponseDto,
} from "@/shared/api/types/api.dto";

export type SendMessageResponseDto = ChatHistoryItemResponseDto | ChatRecommendResponseDto;

export async function getChatHistory() {
  const response = await appApiData<ChatHistoryResponseDto>({
    endpoint: "/chat/history",
    method: "GET",
  });

  return response;
}

export async function sendMessage({ input }: { input: string }) {
  const response = await appApiData<SendMessageResponseDto>({
    endpoint: "/chat/recommend",
    method: "POST",
    body: { input },
    timeoutMs: 60000,
  });
  return response;
}
