import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  menuQueryKeys,
  writeSearchMenuListCache,
} from "@/features/meal-record/hooks/queries/menuCache";
import { folderQueryKeys } from "@/features/personal-menu/folder/hooks/queries/folder.queryKey";
import { getFolders, postMealSearch } from "@/features/search/menu-record/api/mealSearch.api";

type UseMealSearchInfiniteQueryOptions = {
  enabled?: boolean;
  limit: number;
};

export function useMealSearchInfiniteQuery(
  input: string,
  { enabled = true, limit }: UseMealSearchInfiniteQueryOptions,
) {
  const normalizedInput = input.trim();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: menuQueryKeys.search(normalizedInput, limit),
    queryFn: async ({ pageParam }) => {
      const response = await postMealSearch({
        input: normalizedInput,
        limit,
        cursor: pageParam,
      });

      return writeSearchMenuListCache(queryClient, response);
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: enabled && normalizedInput.length > 0,
    gcTime: 0,
  });
}

export function useFolderListInfiniteQuery({ enabled, limit }: UseMealSearchInfiniteQueryOptions) {
  return useInfiniteQuery({
    queryKey: folderQueryKeys.list,
    queryFn: ({ pageParam }) =>
      getFolders({
        limit,
        cursor: pageParam,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled,
    staleTime: Infinity,
  });
}
