import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";

export const restaurantKeys = {
  all: ["restaurants"] as const,
  search: (keyword: string) => [...restaurantKeys.all, "search", keyword],
  // 카카오에서 가져오는 데이터라, 식사 기록 등으로 서버 식당 데이터(all)를 무효화할 때 같이 다시 부르지 않게 따로 둔다.
  nearby: (category: string, center: LatLng | null, keyword: string) => [
    "nearbyRestaurants",
    category,
    center?.lat,
    center?.lng,
    keyword,
  ],
  detail: (restaurantId: number, filter?: string) => [
    ...restaurantKeys.all,
    restaurantId,
    filter ?? "all",
  ],
};
