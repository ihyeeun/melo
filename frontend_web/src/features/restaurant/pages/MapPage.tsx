import { useEffect, useRef, useState } from "react";

import styles from "@/features/restaurant/styles/MapPage.module.css";
import { getCurrentLocation } from "@/features/restaurant/utils/currentLocation.util";
import { loadKakaoMapSdk } from "@/features/restaurant/utils/kakaoMap.util";
import { PageHeader } from "@/shared/commons/header/PageHeader";

// 현재 위치를 못 받았을 때 보여줄 위치(서울시청)
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type LocationStatus = "idle" | "locating" | "denied" | "unavailable";

const LOCATION_MESSAGE: Record<Exclude<LocationStatus, "idle">, string> = {
  locating: "현재 위치를 찾는 중이에요",
  denied: "설정에서 위치 권한을 허용하면 내 주변을 볼 수 있어요",
  unavailable: "현재 위치를 확인하지 못했어요",
};

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isError, setIsError] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("locating");

  useEffect(() => {
    let cancelled = false;

    // 지도와 위치를 동시에 요청한다. 위치가 늦어도 지도는 기다리지 않는다.
    const locationPromise = getCurrentLocation();

    loadKakaoMapSdk()
      .then(() => {
        // 로딩 중에 화면을 떠났으면 지도를 만들지 않는다.
        if (cancelled || !containerRef.current) return;

        const { kakao } = window;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 3,
        });

        // 위치가 이미 도착했으면 바로, 아직이면 도착하는 대로 옮긴다.
        void locationPromise.then((result) => {
          if (cancelled) return;

          if (result.status === "success") {
            map.setCenter(new kakao.maps.LatLng(result.latLng.lat, result.latLng.lng));
            setLocationStatus("idle");
            return;
          }

          setLocationStatus(result.status);
        });
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`page ${styles.root}`}>
      <PageHeader title="식당 위치" />
      <section className={styles.mapSection}>
        {isError ? (
          <p className="body-l-medium text-tertiary">지도를 불러오지 못했어요</p>
        ) : (
          <div ref={containerRef} className={styles.map} />
        )}

        {/* 지도 로드에 실패하면 위치 결과를 처리하지 않으므로 안내도 숨긴다. */}
        {!isError && locationStatus !== "idle" && (
          <p className={`caption-m-medium text-secondary ${styles.locationBadge}`} role="status">
            {LOCATION_MESSAGE[locationStatus]}
          </p>
        )}
      </section>
    </div>
  );
}
