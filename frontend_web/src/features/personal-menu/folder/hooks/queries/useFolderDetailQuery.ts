import { useQuery } from "@tanstack/react-query";

import { getFolderItems } from "@/features/personal-menu/folder/api/folder.api";
import { folderQueryKeys } from "@/features/personal-menu/folder/hooks/queries/folder.queryKey";

export function useFolderDetailQuery(folderId: number) {
  return useQuery({
    queryKey: folderQueryKeys.detail(folderId),
    queryFn: () => getFolderItems({ folder_id: folderId }),
  });
}
