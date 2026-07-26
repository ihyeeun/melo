import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteFolder, upsertFolder } from "@/features/personal-menu/folder/api/folder.api";
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

export function useDeleteFolderMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: async (_data, variables) => {
      const detailQueryKey = folderQueryKeys.detail(variables.folder_id);

      await queryClient.cancelQueries({ queryKey: detailQueryKey });
      queryClient.removeQueries({ queryKey: detailQueryKey, exact: true });
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.list });

      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
