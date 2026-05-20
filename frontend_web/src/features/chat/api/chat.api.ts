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

export async function mealRegister({
  chat_id,
  time,
  menu_ids,
  menu_quantities,
  menu_input_modes,
}: {
  chat_id: number;
  time: number;
  menu_ids: number[];
  menu_quantities: number[];
  menu_input_modes: number[];
}) {
  await appApiData({
    endpoint: "/chat/meal-record",
    method: "POST",
    body: {
      chat_id,
      time,
      menu_ids,
      menu_quantities,
      menu_input_modes,
    },
  });
}

export async function mealDelete({ chat_id }: { chat_id: number }) {
  await appApiData({
    endpoint: "/chat/meal-record/delete",
    method: "POST",
    body: {
      chat_id,
    },
  });
}
