import {
  skipToken,
  useInfiniteQuery,
  useQueries,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  type NearbyCategory,
  searchNearbyRestaurants,
} from "@/features/restaurant/api/nearbyRestaurant.api";
import {
  getRestaurantBrands,
  getRestaurantDetail,
  searchRestaurants,
} from "@/features/restaurant/api/restaurant.api";
import { restaurantKeys } from "@/features/restaurant/constants/restaurant.queryKey";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { RestaurantDetailRequestDto } from "@/shared/api/types/api.request.dto";
import type { RestaurantBrandsResponseDto } from "@/shared/api/types/api.response.dto";

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

// 페이지별 응답을 장소 id로 찾을 수 있게 하나로 합친다.
// 응답의 place_id는 number, 카카오 장소 id는 string이라 문자열로 맞춘다.
// combine에 넘기는 함수가 매번 새로 만들어지지 않도록 밖에 둔다.
function combineBrandByPlaceId(results: UseQueryResult<RestaurantBrandsResponseDto>[]) {
  return new Map(
    results
      .flatMap(({ data }) => data?.restaurants ?? [])
      .map((brand) => [String(brand.place_id), brand] as const),
  );
}

// 카카오 장소 중 멜로 브랜드에 등록된 곳을 장소 id로 찾을 수 있게 돌려준다.
// 카카오 페이지마다 따로 물어봐서, 앞 페이지는 다시 요청하지 않고 한 페이지가 실패해도 다른 페이지 뱃지는 남는다.
export function useRestaurantBrandsQuery(placeIdPages: string[][]) {
  return useQueries({
    queries: placeIdPages.map((placeIds) => ({
      queryKey: restaurantKeys.brands(placeIds),
      queryFn: () => getRestaurantBrands({ place_ids: placeIds }),
      // 서버는 1개 이상만 받는다.
      enabled: placeIds.length > 0,
      staleTime: 5 * 60 * 1000,
      meta: { refetchOnResume: "stale" },
    })),
    combine: combineBrandByPlaceId,
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
