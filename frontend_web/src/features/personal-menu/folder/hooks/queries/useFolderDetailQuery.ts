import { useQuery, useQueryClient } from "@tanstack/react-query";

import { writeMenuSimpleCache } from "@/features/meal-record/hooks/queries/menuCache";
import { getFolderItems } from "@/features/personal-menu/folder/api/folder.api";
import { folderQueryKeys } from "@/features/personal-menu/folder/hooks/queries/folder.queryKey";

export function useFolderDetailQuery(folderId: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: folderQueryKeys.detail(folderId),
    queryFn: async () => {
      const response = await getFolderItems({ folder_id: folderId });

      response.menu_list.forEach((menu) => writeMenuSimpleCache(queryClient, menu));

      return response;
    },
    staleTime: Infinity,
  });
}
