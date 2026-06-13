import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateNickName } from "@/features/profile/api/profile";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { type ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useNickNameUpdateMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNickName,
    onSuccess: (data) => {
      if (callbacks?.onSuccess) callbacks.onSuccess();
      queryClient.setQueryData<ProfileResponseDto>(queryKeys.profile, data);
    },
    onError: (error) => {
      if (callbacks?.onError) callbacks.onError(error);
    },
  });
}
