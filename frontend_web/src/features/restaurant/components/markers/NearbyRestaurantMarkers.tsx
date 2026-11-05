import { useEffect } from "react";

import type { NearbyCategory } from "@/features/restaurant/api/nearbyRestaurant.api";
import { DEFAULT_SNAP_POINT } from "@/features/restaurant/components/map/MapBottomSheet";
import { useNearbyRestaurantsQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { KakaoMap } from "@/features/restaurant/utils/kakaoMap.util";

// 지도에서 상태바와 검색창이 가리는 위쪽 높이(px)
const FIT_TOP_PADDING = 120;
const FIT_EDGE_PADDING = 32;

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
  const firstPage = data?.pages[0];

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

  // 지도 위치는 여기서만 옮긴다. 자식 effect가 부모보다 먼저 실행되므로,
  // MapPage에서 따로 옮기면 캐시가 있을 때 화면 맞춤을 덮어쓴다.
  useEffect(() => {
    if (!center) return;

    const { maps } = window.kakao;
    const centerLatLng = new maps.LatLng(center.lat, center.lng);

    if (!firstPage?.restaurants.length) {
      // 검색 중이거나 검색 결과가 없으면 보던 지도를 그대로 둔다.
      if (!keyword) map.setCenter(centerLatLng);
      return;
    }

    // 첫 페이지에만 맞춘다. 다음 페이지마다 맞추면 사용자가 옮긴 지도가 튄다.
    const bounds = new maps.LatLngBounds();
    // 검색 결과는 멀리 있을 수 있어서, 내 위치까지 넣으면 지도가 크게 축소된다.
    if (!keyword) bounds.extend(centerLatLng);
    firstPage.restaurants.forEach(({ lat, lng }) => bounds.extend(new maps.LatLng(lat, lng)));

    // 시트가 가리는 아래쪽만큼 비워 두고 맞춘다.
    map.setBounds(
      bounds,
      FIT_TOP_PADDING,
      FIT_EDGE_PADDING,
      window.innerHeight * DEFAULT_SNAP_POINT + FIT_EDGE_PADDING,
      FIT_EDGE_PADDING,
    );
  }, [map, center, firstPage, keyword]);

  return null;
}
