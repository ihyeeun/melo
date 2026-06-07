import type { QueryClient } from "@tanstack/react-query";

import { getChatHistory } from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import type {
  ChatHistoryItemResponseDto,
  ChatHistoryResponseDto,
} from "@/shared/api/types/api.dto";

export function appendMissingChatHistoryItemsToCache(
  queryClient: QueryClient,
  incomingItems: ChatHistoryItemResponseDto[],
): ChatHistoryItemResponseDto[] {
  if (incomingItems.length === 0) {
    return [];
  }

  let appendedChatList: ChatHistoryItemResponseDto[] = [];

  queryClient.setQueryData<ChatHistoryResponseDto>(queryKeys.chatHistory, (previous) => {
    if (!previous) {
      appendedChatList = [...incomingItems];

      return {
        chat_list: [...incomingItems],
      };
    }

    const previousItemIds = new Set(previous.chat_list.map((item) => item.id));
    appendedChatList = incomingItems.filter((item) => !previousItemIds.has(item.id));

    if (appendedChatList.length === 0) {
      return previous;
    }

    return {
      ...previous,
      chat_list: [...previous.chat_list, ...appendedChatList],
    };
  });

  return appendedChatList;
}

export function mergeChatHistoryResponseIntoCache(
  queryClient: QueryClient,
  chatHistory: ChatHistoryResponseDto,
) {
  return appendMissingChatHistoryItemsToCache(queryClient, chatHistory.chat_list);
}

export async function refetchAndMergeChatHistoryIntoCache(queryClient: QueryClient) {
  try {
    const chatHistory = await getChatHistory();
    return mergeChatHistoryResponseIntoCache(queryClient, chatHistory);
  } catch (error) {
    throw new Error("결과를 불러오지 못했어요. 다시 시도해주세요.", { cause: error });
  }
}
