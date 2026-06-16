import type { QueryClient } from "@tanstack/react-query";

import { getChatHistory } from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import type { ChatHistoryItemResponseDto } from "@/shared/api/types/api.response.dto";

type ResolveChatHistoryItemOptions = {
  match?: (chatItem: ChatHistoryItemResponseDto) => boolean;
};

export class ChatHistorySyncError extends Error {
  constructor() {
    super("답변 저장을 확인하지 못했어요. 잠시 후 다시 확인해주세요.");
    this.name = "ChatHistorySyncError";
  }
}

export async function refetchAndResolveChatHistoryItem(
  queryClient: QueryClient,
  options?: ResolveChatHistoryItemOptions,
) {
  try {
    const chatHistory = await queryClient.fetchQuery({
      queryKey: queryKeys.chatHistory,
      queryFn: getChatHistory,
      staleTime: 0,
    });
    const matchedChatItems =
      options?.match === undefined
        ? chatHistory.chat_list
        : chatHistory.chat_list.filter(options.match);
    const chatItem = matchedChatItems.at(-1);

    if (!chatItem) {
      throw new ChatHistorySyncError();
    }

    return chatItem;
  } catch (error) {
    if (error instanceof ChatHistorySyncError) {
      throw error;
    }

    throw new Error("결과를 불러오지 못했어요. 다시 시도해주세요.", { cause: error });
  }
}
