import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  type NearbyCategory,
  searchNearbyRestaurants,
} from "@/features/restaurant/api/nearbyRestaurant.api";
import { getRestaurantDetail, searchRestaurants } from "@/features/restaurant/api/restaurant.api";
import { restaurantKeys } from "@/features/restaurant/constants/restaurant.queryKey";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { RestaurantDetailRequestDto } from "@/shared/api/types/api.request.dto";

export function useRestaurantSearchQuery(input: string) {
  const keyword = input.trim();

  return useInfiniteQuery({
    queryKey: restaurantKeys.search(keyword),
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

// center가 정해지기 전(위치를 찾는 중)에는 검색하지 않는다.
// keyword가 비어 있으면 주변 식당을, 있으면 검색 결과를 가져온다.
export function useNearbyRestaurantsQuery(
  category: NearbyCategory,
  center: LatLng | null,
  keyword: string,
) {
  return useInfiniteQuery({
    queryKey: restaurantKeys.nearby(category, center, keyword),
    queryFn: center
      ? ({ pageParam }) => searchNearbyRestaurants(category, center, pageParam, keyword)
      : skipToken,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    // 주변 식당은 금방 바뀌지 않으므로 앱에 돌아올 때마다 카카오를 다시 호출하지 않는다.
    staleTime: 5 * 60 * 1000,
    meta: { refetchOnResume: "stale" },
  });
}

export function useRestaurantDetailQuery({ restaurant_id, filter }: RestaurantDetailRequestDto) {
  return useQuery({
    queryKey: restaurantKeys.detail(restaurant_id, filter),
    queryFn: () => getRestaurantDetail({ restaurant_id, ...(filter ? { filter } : {}) }),
    enabled: Number.isSafeInteger(restaurant_id) && restaurant_id > 0,
    staleTime: Infinity,
  });
}
