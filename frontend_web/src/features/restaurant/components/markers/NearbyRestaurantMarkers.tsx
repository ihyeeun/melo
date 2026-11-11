import { useEffect, useEffectEvent, useRef } from "react";

import type {
  NearbyCategory,
  NearbyRestaurant,
} from "@/features/restaurant/api/nearbyRestaurant.api";
import {
  useNearbyRestaurantsQuery,
  useRestaurantBrandsQuery,
} from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/NearbyRestaurantMarkers.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { KakaoCustomOverlay, KakaoMap } from "@/features/restaurant/utils/kakaoMap.util";

type NearbyRestaurantMarkersProps = {
  map: KakaoMap;
  category: NearbyCategory;
  center: LatLng | null;
  keyword: string;
  selectedPlaceId: string | null;
  onSelectRestaurant: (restaurant: SheetRestaurant) => void;
};

// 선택된 마커는 내 위치 표시(zIndex 3)보다 위에, 멜로 식당은 일반 식당보다 위에 둔다.
function getMarkerZIndex(isMelo: boolean, isSelected: boolean) {
  if (isSelected) return 4;
  if (isMelo) return 2;
  return 1;
}

function createMarkerElement(name: string) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = styles.marker;
  element.setAttribute("aria-label", name);

  const icon = document.createElement("span");
  icon.className = styles.icon;

  const label = document.createElement("span");
  label.className = `caption-m-semi ${styles.label}`;
  // 카카오에서 받은 이름이라 HTML로 해석되지 않도록 textContent로 넣는다.
  label.textContent = name;

  element.append(icon, label);
  return element;
}

export default function NearbyRestaurantMarkers({
  map,
  category,
  center,
  keyword,
  selectedPlaceId,
  onSelectRestaurant,
}: NearbyRestaurantMarkersProps) {
  // 목록과 같은 쿼리라 요청은 한 번만 나간다.
  const { data } = useNearbyRestaurantsQuery(category, center, keyword);
  const brandByPlaceId = useRestaurantBrandsQuery(
    data?.pages.map((page) => page.restaurants.map(({ id }) => id)) ?? [],
  );
  // 장소 id별 마커. 멜로 여부나 선택 상태가 바뀌어도 다시 만들지 않고 표시만 바꾼다.
  const markersRef = useRef(
    new Map<string, { overlay: KakaoCustomOverlay; element: HTMLButtonElement }>(),
  );

  // 멜로 식당 정보가 나중에 와도 마커를 다시 만들지 않고, 누른 시점의 최신 정보를 쓴다.
  const handleMarkerClick = useEffectEvent((restaurant: NearbyRestaurant) => {
    onSelectRestaurant({
      ...restaurant,
      restaurantId: brandByPlaceId.get(restaurant.id)?.restaurant_id ?? null,
    });
  });

  // 다음 페이지가 오면 불러온 식당 전체로 마커를 다시 그린다.
  useEffect(() => {
    if (!data) return;

    const { maps } = window.kakao;
    const markers = markersRef.current;

    data.pages
      .flatMap((page) => page.restaurants)
      .forEach((restaurant) => {
        const element = createMarkerElement(restaurant.name);
        element.addEventListener("click", () => handleMarkerClick(restaurant));

        const overlay = new maps.CustomOverlay({
          map,
          position: new maps.LatLng(restaurant.lat, restaurant.lng),
          content: element,
          // 상태마다 아이콘의 기준점이 달라서 CSS로 맞춘다. 요소의 왼쪽 위를 식당 좌표에 둔다.
          xAnchor: 0,
          yAnchor: 0,
          clickable: true,
        });
        markers.set(restaurant.id, { overlay, element });
      });

    return () => {
      markers.forEach(({ overlay }) => overlay.setMap(null));
      markers.clear();
    };
  }, [map, data]);

  // 아이콘은 data 속성에 따라 CSS가 고른다.
  useEffect(() => {
    markersRef.current.forEach(({ overlay, element }, placeId) => {
      const isMelo = Boolean(brandByPlaceId.get(placeId));
      const isSelected = placeId === selectedPlaceId;

      element.dataset.melo = String(isMelo);
      element.dataset.selected = String(isSelected);
      overlay.setZIndex(getMarkerZIndex(isMelo, isSelected));
    });
  }, [data, brandByPlaceId, selectedPlaceId]);

  return null;
}
