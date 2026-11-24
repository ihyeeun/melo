import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import {
  type KakaoPlace,
  type KakaoPlacesCallback,
  loadKakaoMapSdk,
} from "@/features/restaurant/utils/kakaoMap.util";

const CATEGORY_CODE = { RESTAURANT: "FD6", CAFE: "CE7" } as const;
// 카카오는 한 번에 15개까지, 한 검색에 3페이지(45개)까지만 준다.
const PAGE_SIZE = 15;
const MAX_PAGE = 3;

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

// 카카오가 주는 만큼(최대 45개)을 한 번에 가져온다.
export async function searchNearbyRestaurants(
  category: NearbyCategory,
  center: LatLng,
  keyword: string,
) {
  await loadKakaoMapSdk();

  // 키워드 검색은 가까운 반경부터 찾고, 결과가 없을 때만 다음 반경으로 넓힌다.
  const radiusSteps = keyword ? KEYWORD_SEARCH_RADIUS_STEPS : [NEARBY_SEARCH_RADIUS_METERS];

  for (const radius of radiusSteps) {
    const firstPage = await requestRestaurants(category, center, 1, keyword, radius);
    if (firstPage.restaurants.length === 0) continue;

    // 첫 페이지에 마지막 페이지 번호가 오므로 나머지는 한꺼번에 요청한다.
    // 마지막 페이지를 넘겨 요청해도 결과가 오므로 last까지만 요청한다.
    const restPageNumbers = Array.from(
      { length: Math.min(firstPage.lastPage, MAX_PAGE) - 1 },
      (_, index) => index + 2,
    );
    // 뒤 페이지가 실패해도 받은 식당은 보여준다.
    const restPages = await Promise.allSettled(
      restPageNumbers.map((page) => requestRestaurants(category, center, page, keyword, radius)),
    );

    return [
      ...firstPage.restaurants,
      ...restPages.flatMap((result) =>
        result.status === "fulfilled" ? result.value.restaurants : [],
      ),
    ];
  }

  return [];
}

function requestRestaurants(
  category: NearbyCategory,
  center: LatLng,
  page: number,
  keyword: string,
  radius: number,
) {
  const { maps } = window.kakao;

  return new Promise<{ restaurants: NearbyRestaurant[]; lastPage: number }>((resolve, reject) => {
    const handleSearchResult: KakaoPlacesCallback = (places, status, pagination) => {
      // 결과 0건은 실패가 아니다(주변에 식당이 없거나 검색 결과가 없는 경우).
      if (status === maps.services.Status.ZERO_RESULT) {
        resolve({ restaurants: [], lastPage: 0 });
        return;
      }

      if (status !== maps.services.Status.OK) {
        reject(new Error("주변 식당을 불러오지 못했습니다."));
        return;
      }

      resolve({
        restaurants: places.map(toNearbyRestaurant),
        lastPage: pagination.last,
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
