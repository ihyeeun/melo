import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getPersonalizedManagement } from "@/features/chat/api/chat.api";
import { refetchAndResolveChatHistoryItem } from "@/features/chat/hooks/queries/chatHistoryCache";
import {
  getChatHistoryPlaybackBaselineIds,
  setChatHistoryPlaybackBaselineIds,
} from "@/features/chat/utils/chatHistoryPlayback";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function usePersonalizedManagementMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["personalized-management"],
    mutationFn: async () => {
      // 새 답변이 기존 기록에 포함되지 않도록 생성 요청 전에 기준 ID를 확보한다.
      const baselineIds = await getChatHistoryPlaybackBaselineIds(queryClient);
      const response = await getPersonalizedManagement();
      await refetchAndResolveChatHistoryItem(queryClient, {
        match: (item) =>
          !baselineIds?.includes(item.id) &&
          item.response_payload.chat_category === response.chat_category,
      });

      if (baselineIds !== null) {
        setChatHistoryPlaybackBaselineIds(queryClient, baselineIds);
      }
    },
    retry: false,
    onSuccess: () => callbacks?.onSuccess?.(),
    onError: (error) => callbacks?.onError?.(error),
  });
}
