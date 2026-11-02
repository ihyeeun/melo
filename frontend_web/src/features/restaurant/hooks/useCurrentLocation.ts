import { useEffect, useState } from "react";

import {
  type CurrentLocationResult,
  getCurrentLocation,
  type LatLng,
} from "@/features/restaurant/utils/currentLocation.util";

// 위치를 못 받으면 fallback을 기준점(center)으로 쓴다.
// 다시 찾는 동안에는 이전 기준점을 유지해서 목록이 비지 않게 한다.
export function useCurrentLocation(fallback: LatLng) {
  const [result, setResult] = useState<CurrentLocationResult | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getCurrentLocation().then((next) => {
      if (cancelled) return;
      setResult(next);
      setIsLocating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setIsLocating(true);
    setAttempt((prev) => prev + 1);
  };

  // 첫 결과가 오기 전에는 null이다.
  const center = result && (result.status === "success" ? result.latLng : fallback);
  const status = isLocating || !result ? "locating" : result.status;

  return { center, status, retry } as const;
}
