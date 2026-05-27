import { useInfiniteQuery } from "@tanstack/react-query";

import { postMealSearch } from "@/features/search/menu-record/api/postMealSearch";

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
