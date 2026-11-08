import { useEffect, useEffectEvent } from "react";

import type {
  NearbyCategory,
  NearbyRestaurant,
} from "@/features/restaurant/api/nearbyRestaurant.api";
import {
  useNearbyRestaurantsQuery,
  useRestaurantBrandsQuery,
} from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { KakaoMap } from "@/features/restaurant/utils/kakaoMap.util";

type NearbyRestaurantMarkersProps = {
  map: KakaoMap;
  category: NearbyCategory;
  center: LatLng | null;
  keyword: string;
  onSelectRestaurant: (restaurant: SheetRestaurant) => void;
};

export default function NearbyRestaurantMarkers({
  map,
  category,
  center,
  keyword,
  onSelectRestaurant,
}: NearbyRestaurantMarkersProps) {
  // 목록과 같은 쿼리라 요청은 한 번만 나간다.
  const { data } = useNearbyRestaurantsQuery(category, center, keyword);
  const brandByPlaceId = useRestaurantBrandsQuery(
    data?.pages.map((page) => page.restaurants.map(({ id }) => id)) ?? [],
  );

  // 멜로 식당 정보가 나중에 와도 마커를 다시 만들지 않고, 누른 시점의 최신 정보를 쓴다.
  const handleMarkerClick = useEffectEvent((restaurant: NearbyRestaurant) => {
    onSelectRestaurant({
      restaurantId: brandByPlaceId.get(restaurant.id)?.restaurant_id ?? null,
      restaurantName: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
    });
  });

  // 다음 페이지가 오면 불러온 식당 전체로 마커를 다시 그린다.
  useEffect(() => {
    if (!data) return;

    const { maps } = window.kakao;
    const markers = data.pages
      .flatMap((page) => page.restaurants)
      .map((restaurant) => {
        const marker = new maps.Marker({
          map,
          position: new maps.LatLng(restaurant.lat, restaurant.lng),
          title: restaurant.name,
        });
        maps.event.addListener(marker, "click", () => handleMarkerClick(restaurant));
        return marker;
      });

    return () => markers.forEach((marker) => marker.setMap(null));
  }, [map, data]);

  return null;
}
