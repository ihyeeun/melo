import { isNativeApp, requestNativeCurrentLocation } from "@/shared/api/bridge/nativeBridge";

export type LatLng = { lat: number; lng: number };

export type CurrentLocationResult =
  | { status: "success"; latLng: LatLng }
  | { status: "denied" | "unavailable" };

// 위치를 못 받아도 지도는 보여줘야 하므로 에러를 던지지 않고 실패 이유를 돌려준다.
export async function getCurrentLocation(): Promise<CurrentLocationResult> {
  if (!isNativeApp()) return { status: "unavailable" };

  try {
    const { latitude, longitude } = await requestNativeCurrentLocation();
    return { status: "success", latLng: { lat: latitude, lng: longitude } };
  } catch (error) {
    // 앱이 보낸 에러 코드는 error.error에 담겨 온다.
    const errorCode = (error as { error?: string }).error;
    return { status: errorCode === "LOCATION_PERMISSION_DENIED" ? "denied" : "unavailable" };
  }
}
