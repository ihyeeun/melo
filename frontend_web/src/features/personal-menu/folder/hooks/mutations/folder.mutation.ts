import { useMutation, useQueryClient } from "@tanstack/react-query";

import { upsertFolder } from "@/features/personal-menu/folder/api/folder.api";
import { folderQueryKeys } from "@/features/personal-menu/folder/hooks/queries/folder.queryKey";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useUpsertFolderMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertFolder,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.list });

      if (typeof variables.folder_id === "number") {
        await queryClient.invalidateQueries({
          queryKey: folderQueryKeys.detail(variables.folder_id),
        });
      }
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
