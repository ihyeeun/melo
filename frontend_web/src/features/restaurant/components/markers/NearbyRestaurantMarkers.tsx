import { useEffect } from "react";

import type { NearbyCategory } from "@/features/restaurant/api/nearbyRestaurant.api";
import { useNearbyRestaurantsQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { KakaoMap } from "@/features/restaurant/utils/kakaoMap.util";

type NearbyRestaurantMarkersProps = {
  map: KakaoMap;
  category: NearbyCategory;
  center: LatLng | null;
  keyword: string;
};

export default function NearbyRestaurantMarkers({
  map,
  category,
  center,
  keyword,
}: NearbyRestaurantMarkersProps) {
  // 목록과 같은 쿼리라 요청은 한 번만 나간다.
  const { data } = useNearbyRestaurantsQuery(category, center, keyword);

  // 다음 페이지가 오면 불러온 식당 전체로 마커를 다시 그린다.
  useEffect(() => {
    if (!data) return;

    const { maps } = window.kakao;
    const markers = data.pages
      .flatMap((page) => page.restaurants)
      .map(
        (restaurant) =>
          new maps.Marker({
            map,
            position: new maps.LatLng(restaurant.lat, restaurant.lng),
            title: restaurant.name,
          }),
      );

    return () => markers.forEach((marker) => marker.setMap(null));
  }, [map, data]);

  return null;
}
