import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import { type KakaoPlace, loadKakaoMapSdk } from "@/features/restaurant/utils/kakaoMap.util";

const CATEGORY_CODE = { RESTAURANT: "FD6", CAFE: "CE7" } as const;
const PAGE_SIZE = 15;

export const SEARCH_RADIUS_METERS = 1000;

export type NearbyCategory = keyof typeof CATEGORY_CODE;

export type NearbyRestaurant = LatLng & {
  id: string;
  name: string;
  category: string;
  distance: number;
};

export async function searchNearbyRestaurants(
  category: NearbyCategory,
  center: LatLng,
  page: number,
) {
  await loadKakaoMapSdk();
  const { maps } = window.kakao;

  return new Promise<{ restaurants: NearbyRestaurant[]; nextPage?: number }>((resolve, reject) => {
    new maps.services.Places().categorySearch(
      CATEGORY_CODE[category],
      (places, status, pagination) => {
        // 결과 0건은 실패가 아니다(주변에 식당이 없는 지역).
        if (status === maps.services.Status.ZERO_RESULT) {
          resolve({ restaurants: [] });
          return;
        }

        if (status !== maps.services.Status.OK) {
          reject(new Error("주변 식당을 불러오지 못했습니다."));
          return;
        }

        resolve({
          restaurants: places.map(toNearbyRestaurant),
          nextPage: pagination.hasNextPage ? page + 1 : undefined,
        });
      },
      {
        location: new maps.LatLng(center.lat, center.lng),
        radius: SEARCH_RADIUS_METERS,
        sort: maps.services.SortBy.DISTANCE,
        size: PAGE_SIZE,
        page,
      },
    );
  });
}

function toNearbyRestaurant(place: KakaoPlace): NearbyRestaurant {
  return {
    id: place.id,
    name: place.place_name,
    // "음식점 > 한식 > 해장국"에서 그룹명 다음 단계(한식)를 쓴다.
    category: place.category_name.split(" > ")[1] ?? place.category_name,
    // 카카오는 좌표를 문자열로 주고, y가 위도다.
    lat: Number(place.y),
    lng: Number(place.x),
    distance: Number(place.distance),
  };
}
