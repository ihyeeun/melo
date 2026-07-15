import { useQuery } from "@tanstack/react-query";

import { getChatHistory, searchMenu } from "@/features/chat/api/chat.api";
import { queryKeys } from "@/features/chat/hooks/queries/queryKey";

export function useGetChatHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.chatHistory,
    queryFn: getChatHistory,
    staleTime: Infinity,
  });
}

export function useSearchMenuQuery(text: string, options: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["searchMenu", text],
    queryFn: () => searchMenu({ text }),
    enabled: options.enabled && text.length > 0,
    staleTime: 1 * 60 * 1000,
  });
}
