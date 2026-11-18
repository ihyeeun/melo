import * as Location from "expo-location";

import type { BridgeLocationRequestPayload } from "@/src/shared/api/bridge/bridge.types";
import { BridgeHandledError } from "@/src/shared/api/bridge/bridgeError";

export type CurrentLocation = {
  latitude: number;
  longitude: number;
};

export async function getCurrentLocation({
  askPermission = true,
}: BridgeLocationRequestPayload = {}): Promise<CurrentLocation> {
  const permission = askPermission
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    // 웹은 이 값으로 권한 팝업을 다시 띄울지, 설정 앱으로 보낼지 정한다
    throw new BridgeHandledError("위치 권한이 필요해요.", 403, "LOCATION_PERMISSION_DENIED", {
      canAskAgain: permission.canAskAgain,
    });
  }

  try {
    // 주변 검색에는 수십 미터 정확도면 충분하다. 최고 정확도는 GPS를 오래 기다린다.
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    // 위치 서비스가 꺼져 있거나 위치를 잡지 못한 경우
    throw new BridgeHandledError("현재 위치를 확인하지 못했어요.", 503, "LOCATION_UNAVAILABLE");
  }
}
