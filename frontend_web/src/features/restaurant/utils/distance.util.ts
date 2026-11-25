import type { NearbyRestaurant } from "@/features/restaurant/api/nearbyRestaurant.api";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadian(degree: number) {
  return (degree * Math.PI) / 180;
}

// 두 좌표 사이의 직선거리(m)
function getDistanceMeters(from: LatLng, to: LatLng) {
  const latDiff = toRadian(to.lat - from.lat);
  const lngDiff = toRadian(to.lng - from.lng);
  const haversine =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadian(from.lat)) * Math.cos(toRadian(to.lat)) * Math.sin(lngDiff / 2) ** 2;

  return Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine)));
}

// 거리는 내 위치에서 잰다. 내 위치를 모르면 카카오가 준 검색 기준점에서의 거리를 쓴다.
export function getRestaurantDistance(restaurant: NearbyRestaurant, myLocation: LatLng | null) {
  return myLocation ? getDistanceMeters(myLocation, restaurant) : restaurant.distance;
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}
