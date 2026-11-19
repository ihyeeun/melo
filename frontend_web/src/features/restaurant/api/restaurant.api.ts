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

export function getRestaurantBrands(body: RestaurantBrandsRequestDto) {
  return appApiData<RestaurantBrandsResponseDto>({
    endpoint: "/restaurant/brands",
    method: "POST",
    body,
  });
}
