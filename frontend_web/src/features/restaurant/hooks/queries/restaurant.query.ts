import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getRestaurantDetail, searchRestaurants } from "@/features/restaurant/api/restaurant.api";
import type { RestaurantDetailRequestDto } from "@/shared/api/types/api.request.dto";

export function useRestaurantSearchQuery(input: string) {
  const keyword = input.trim();

  return useInfiniteQuery({
    queryKey: ["restaurant", "search", keyword],
    queryFn: ({ pageParam }) =>
      searchRestaurants({
        input: keyword,
        limit: 20,
        ...(pageParam === null ? {} : { cursor: pageParam }),
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useRestaurantDetailQuery({ restaurant_id, filter }: RestaurantDetailRequestDto) {
  return useQuery({
    queryKey: ["restaurant", "detail", restaurant_id, filter ?? "all"],
    queryFn: () => getRestaurantDetail({ restaurant_id, ...(filter ? { filter } : {}) }),
    enabled: Number.isSafeInteger(restaurant_id) && restaurant_id > 0,
  });
}
