import { useMutation, useQueryClient } from "@tanstack/react-query";

import { upsertMenuSet } from "@/features/personal-menu/set/api/menuSet.api";
import { menuSetQueryKeys } from "@/features/personal-menu/set/hooks/queries/menuSet.queryKey";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useUpsertMenuSetMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertMenuSet,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: menuSetQueryKeys.list });

      if (typeof variables.set_id === "number") {
        await queryClient.invalidateQueries({
          queryKey: menuSetQueryKeys.detail(variables.set_id),
        });
      }

      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
