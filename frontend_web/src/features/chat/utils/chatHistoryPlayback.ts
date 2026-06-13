import type { QueryClient } from "@tanstack/react-query";

import { getChatHistory } from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";
import type { ChatHistoryResponseDto } from "@/shared/api/types/api.response.dto";

const chatHistoryPlaybackBaselineQueryKey = ["chat-history-playback-baseline"] as const;

export async function getChatHistoryPlaybackBaselineIds(queryClient: QueryClient) {
  const cachedBaseline = getCachedChatHistoryIds(queryClient);

  try {
    const chatHistory = await queryClient.fetchQuery({
      queryKey: queryKeys.chatHistory,
      queryFn: getChatHistory,
      staleTime: 0,
    });

    return getChatHistoryIds(chatHistory);
  } catch {
    return cachedBaseline;
  }
}

export function setChatHistoryPlaybackBaselineIds(
  queryClient: QueryClient,
  playbackBaselineChatIds: readonly number[],
) {
  queryClient.setQueryData(chatHistoryPlaybackBaselineQueryKey, [...playbackBaselineChatIds]);
}

export function consumeChatHistoryPlaybackBaselineIds(queryClient: QueryClient) {
  const playbackBaselineChatIds = queryClient.getQueryData<number[]>(
    chatHistoryPlaybackBaselineQueryKey,
  );

  queryClient.removeQueries({
    queryKey: chatHistoryPlaybackBaselineQueryKey,
  });

  return playbackBaselineChatIds ?? null;
}

function getCachedChatHistoryIds(queryClient: QueryClient) {
  const cachedHistory = queryClient.getQueryData<ChatHistoryResponseDto>(queryKeys.chatHistory);

  if (!cachedHistory) {
    return null;
  }

  return getChatHistoryIds(cachedHistory);
}

function getChatHistoryIds(chatHistory: ChatHistoryResponseDto) {
  return chatHistory.chat_list.map((chatItem) => chatItem.id);
}
