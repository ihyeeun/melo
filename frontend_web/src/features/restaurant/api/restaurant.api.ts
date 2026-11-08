import { appApiData } from "@/shared/api/apiClient";
import type {
  RestaurantBrandsRequestDto,
  RestaurantDetailRequestDto,
  RestaurantSearchRequestDto,
} from "@/shared/api/types/api.request.dto";
import type {
  RestaurantBrandsResponseDto,
  RestaurantDetailResponseDto,
  RestaurantSearchResponseDto,
} from "@/shared/api/types/api.response.dto";

export function searchRestaurants(body: RestaurantSearchRequestDto) {
  return appApiData<RestaurantSearchResponseDto>({
    endpoint: "/restaurant/search",
    method: "POST",
    body,
  });
}

export function getRestaurantDetail(body: RestaurantDetailRequestDto) {
  return appApiData<RestaurantDetailResponseDto>({
    endpoint: "/restaurant/detail",
    method: "POST",
    body,
  });
}

// TODO: 서버에 멜로 식당 데이터가 들어오면 지운다.
// 개발 환경에서는 서버 대신, 요청한 장소 중 첫 번째를 이 restaurant_id의 멜로 식당으로 돌려준다.
const DEV_MELO_RESTAURANT_ID = 1204;

export function getRestaurantBrands(body: RestaurantBrandsRequestDto) {
  if (import.meta.env.DEV) {
    return Promise.resolve<RestaurantBrandsResponseDto>({
      restaurants: [
        {
          place_id: Number(body.place_ids[0]),
          restaurant_id: DEV_MELO_RESTAURANT_ID,
          restaurant_name: "임시 멜로 식당",
        },
      ],
    });
  }

  return appApiData<RestaurantBrandsResponseDto>({
    endpoint: "/restaurant/brands",
    method: "POST",
    body,
  });
}
