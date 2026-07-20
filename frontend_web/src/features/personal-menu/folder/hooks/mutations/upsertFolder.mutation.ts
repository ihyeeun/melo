import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createFolder } from "@/features/personal-menu/folder/api/createFolder.api";
import { folderQueryKeys } from "@/features/personal-menu/folder/hooks/queries/folder.queryKey";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useUpsertFolderMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.list });
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
