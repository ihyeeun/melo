import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query";

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
import type { RestaurantBrandPlaceResponseDto } from "@/shared/api/types/api.response.dto";

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
  return useQuery({
    queryKey: restaurantKeys.nearby(category, center, keyword),
    queryFn: center ? () => searchNearbyRestaurants(category, center, keyword) : skipToken,
    // 주변 식당은 금방 바뀌지 않으므로 앱에 돌아올 때마다 카카오를 다시 호출하지 않는다.
    staleTime: 5 * 60 * 1000,
    meta: { refetchOnResume: "stale" },
  });
}

type MeloRestaurant = RestaurantBrandPlaceResponseDto & { restaurant_id: number };
type BrandEntry = readonly [placeId: string, brand: MeloRestaurant | null];

// 받기 전에도 늘 같은 Map을 돌려줘서, 이 값을 의존성으로 쓰는 effect가 렌더마다 다시 돌지 않게 한다.
const NO_BRANDS = new Map<string, MeloRestaurant | null>();

// 응답에 있어도 restaurant_id가 없으면 멜로 식당이 아니다.
// 물어본 장소마다 멜로 식당이 아니면 null을 채워 확인 전과 구분한다.
// 응답의 place_id는 number, 카카오 장소 id는 string이라 문자열로 맞춘다.
async function getBrandByPlaceId(placeIds: string[]) {
  const { restaurants } = await getRestaurantBrands({ place_ids: placeIds });
  return new Map(
    placeIds.map((placeId): BrandEntry => [
      placeId,
      restaurants.find(
        (brand): brand is MeloRestaurant =>
          String(brand.place_id) === placeId && brand.restaurant_id !== null,
      ) ?? null,
    ]),
  );
}

// 카카오 장소 id → 멜로 식당. 멜로 식당이 아니면 null, 아직 확인하지 못했으면 값이 없다.
export function useRestaurantBrandsQuery(placeIds: string[]) {
  const { data } = useQuery({
    queryKey: restaurantKeys.brands(placeIds),
    queryFn: () => getBrandByPlaceId(placeIds),
    // 서버는 1개 이상만 받는다.
    enabled: placeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    meta: { refetchOnResume: "stale" },
  });

  return data ?? NO_BRANDS;
}

export function useRestaurantDetailQuery({ restaurant_id, filter }: RestaurantDetailRequestDto) {
  return useQuery({
    queryKey: restaurantKeys.detail(restaurant_id, filter),
    queryFn: () => getRestaurantDetail({ restaurant_id, ...(filter ? { filter } : {}) }),
    enabled: Number.isSafeInteger(restaurant_id) && restaurant_id > 0,
    staleTime: Infinity,
  });
}
