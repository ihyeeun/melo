import { isNativeApp, requestNativeCurrentLocation } from "@/shared/api/bridge/nativeBridge";
import type { LocationRequestPayload } from "@/shared/api/bridge/nativeBridge.types";

export type LatLng = { lat: number; lng: number };

// denied는 권한 팝업을 다시 띄울 수 있고, blocked는 설정 앱에서만 켤 수 있다.
export type CurrentLocationResult =
  | { status: "success"; latLng: LatLng }
  | { status: "denied" | "blocked" | "unavailable" };

// 위치를 못 받아도 지도는 보여줘야 하므로 에러를 던지지 않고 실패 이유를 돌려준다.
export async function getCurrentLocation(
  payload?: LocationRequestPayload,
): Promise<CurrentLocationResult> {
  if (!isNativeApp()) return { status: "unavailable" };

  try {
    const { latitude, longitude } = await requestNativeCurrentLocation(payload);
    return { status: "success", latLng: { lat: latitude, lng: longitude } };
  } catch (error) {
    // 앱이 보낸 에러 코드와 추가 정보는 error에 그대로 담겨 온다.
    const { error: errorCode, canAskAgain } = error as { error?: string; canAskAgain?: boolean };
    if (errorCode !== "LOCATION_PERMISSION_DENIED") return { status: "unavailable" };

    // canAskAgain을 보내지 않는 옛 앱에서는 지금처럼 설정 앱으로 안내한다.
    return { status: canAskAgain ? "denied" : "blocked" };
  }
}
