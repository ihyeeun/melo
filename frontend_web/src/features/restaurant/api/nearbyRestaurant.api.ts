import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import {
  type KakaoPlace,
  type KakaoPlacesCallback,
  loadKakaoMapSdk,
} from "@/features/restaurant/utils/kakaoMap.util";

const CATEGORY_CODE = { RESTAURANT: "FD6", CAFE: "CE7" } as const;
const PAGE_SIZE = 15;

const NEARBY_SEARCH_RADIUS_METERS = 1000;
// 검색 결과가 없을 때 차례로 넓혀 볼 반경(m). 카카오 최대 반경은 20km다.
const KEYWORD_SEARCH_RADIUS_STEPS = [5000, 10000, 20000];

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
  keyword: string,
) {
  await loadKakaoMapSdk();

  if (!keyword) {
    return requestRestaurants(category, center, page, keyword, NEARBY_SEARCH_RADIUS_METERS);
  }

  // 가까운 반경부터 찾고, 결과가 없을 때만 다음 반경으로 넓힌다.
  for (const radius of KEYWORD_SEARCH_RADIUS_STEPS) {
    const result = await requestRestaurants(category, center, page, keyword, radius);
    if (result.restaurants.length > 0) return result;
  }

  return { restaurants: [] };
}

function requestRestaurants(
  category: NearbyCategory,
  center: LatLng,
  page: number,
  keyword: string,
  radius: number,
) {
  const { maps } = window.kakao;

  return new Promise<{ restaurants: NearbyRestaurant[]; nextPage?: number }>((resolve, reject) => {
    const handleSearchResult: KakaoPlacesCallback = (places, status, pagination) => {
      // 결과 0건은 실패가 아니다(주변에 식당이 없거나 검색 결과가 없는 경우).
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
    };

    const placesService = new maps.services.Places();
    const categoryCode = CATEGORY_CODE[category];
    const searchOptions = {
      location: new maps.LatLng(center.lat, center.lng),
      radius,
      sort: maps.services.SortBy.DISTANCE,
      size: PAGE_SIZE,
      page,
    };

    if (keyword) {
      placesService.keywordSearch(keyword, handleSearchResult, {
        ...searchOptions,
        category_group_code: categoryCode,
      });
      return;
    }

    placesService.categorySearch(categoryCode, handleSearchResult, searchOptions);
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
