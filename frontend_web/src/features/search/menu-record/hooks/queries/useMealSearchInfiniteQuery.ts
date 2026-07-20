import { useInfiniteQuery } from "@tanstack/react-query";

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

  return useInfiniteQuery({
    queryKey: ["meal-search", normalizedInput, limit],
    queryFn: ({ pageParam }) =>
      postMealSearch({
        input: normalizedInput,
        limit,
        cursor: pageParam,
      }),
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
    gcTime: 0,
  });
}
