import { appApiData } from "@/shared/api/apiClient";
import type {
  RestaurantDetailRequestDto,
  RestaurantSearchRequestDto,
} from "@/shared/api/types/api.request.dto";
import type {
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
