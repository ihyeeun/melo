import { useInfiniteQuery } from "@tanstack/react-query";

import { getMenuSetList } from "@/features/personal-menu/set/api/menuSet.api";
import { menuSetQueryKeys } from "@/features/personal-menu/set/hooks/queries/menuSet.queryKey";

type UseMenuSetListInfiniteQueryOptions = {
  enabled?: boolean;
  limit: number;
};

export function useMenuSetListInfiniteQuery({
  enabled = true,
  limit,
}: UseMenuSetListInfiniteQueryOptions) {
  return useInfiniteQuery({
    queryKey: menuSetQueryKeys.list,
    queryFn: ({ pageParam }) =>
      getMenuSetList({
        limit,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled,
    gcTime: 0,
  });
}
