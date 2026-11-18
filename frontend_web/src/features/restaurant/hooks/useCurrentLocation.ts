import { useEffect, useState } from "react";

import {
  type CurrentLocationResult,
  getCurrentLocation,
  type LatLng,
} from "@/features/restaurant/utils/currentLocation.util";
import { useNativeAppFeature } from "@/shared/api/bridge/useNativeAppFeature";

// 앱이 백그라운드에서 돌아오면 앱이 웹에 보내는 이벤트
const APP_FOREGROUND_EVENT_NAME = "MELO_APP_FOREGROUND";

// 위치를 못 받으면 fallback을 기준점(center)으로 쓴다.
// 다시 찾는 동안에는 이전 기준점을 유지해서 목록이 비지 않게 한다.
export function useCurrentLocation(fallback: LatLng) {
  const canCheckWithoutPrompt = useNativeAppFeature("LOCATION_CHECK_WITHOUT_PROMPT");
  const [result, setResult] = useState<CurrentLocationResult | null>(null);
  // 다시 찾다 실패해도 기준점이 fallback으로 튀지 않게 마지막으로 받은 위치를 둔다.
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  // 새 값을 넣을 때마다 다시 찾는다.
  const [attempt, setAttempt] = useState({ askPermission: true });

  useEffect(() => {
    let cancelled = false;

    void getCurrentLocation(attempt).then((next) => {
      if (cancelled) return;
      setResult(next);
      if (next.status === "success") setMyLocation(next.latLng);
      setIsLocating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setIsLocating(true);
    setAttempt({ askPermission: true });
  };

  // 첫 결과가 오기 전에는 null이다.
  const center = result && (myLocation ?? fallback);
  const status = isLocating || !result ? "locating" : result.status;
  const isPermissionDenied = status === "denied" || status === "blocked";

  // 설정 앱에서 권한을 켜고 돌아오면 바로 내 위치를 보여 준다.
  // 돌아올 때마다 권한 팝업이 뜨지 않도록 묻지 않고 지금 권한으로만 찾는다.
  useEffect(() => {
    if (!canCheckWithoutPrompt || !isPermissionDenied) return;

    const handleAppForeground = () => setAttempt({ askPermission: false });

    window.addEventListener(APP_FOREGROUND_EVENT_NAME, handleAppForeground);
    return () => window.removeEventListener(APP_FOREGROUND_EVENT_NAME, handleAppForeground);
  }, [canCheckWithoutPrompt, isPermissionDenied]);

  return { center, myLocation, status, retry } as const;
}
