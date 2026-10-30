import { useEffect, useRef, useState } from "react";

import styles from "@/features/restaurant/styles/MapPage.module.css";
import {
  type CurrentLocationResult,
  getCurrentLocation,
} from "@/features/restaurant/utils/currentLocation.util";
import { loadKakaoMapSdk } from "@/features/restaurant/utils/kakaoMap.util";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type MapStatus = "loading" | "ready" | "error";
type LocationStatus = "locating" | CurrentLocationResult["status"];

const LOCATION_MESSAGE: Record<Exclude<LocationStatus, "success">, string> = {
  locating: "현재 위치를 찾는 중이에요",
  denied: "설정에서 위치 권한을 허용하면 내 주변을 볼 수 있어요",
  unavailable: "현재 위치를 확인하지 못했어요",
};

export default function MapPage() {
  const baseMap = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("locating");

  useEffect(() => {
    let cancelled = false;

    // 지도와 위치를 동시에 요청한다. 위치가 늦어도 지도는 기다리지 않는다.
    const locationPromise = getCurrentLocation();
    void locationPromise.then((result) => {
      if (!cancelled) setLocationStatus(result.status);
    });

    loadKakaoMapSdk()
      .then(() => {
        // 로딩 중에 화면을 떠났으면 지도를 만들지 않는다.
        if (cancelled || !baseMap.current) return;

        const { kakao } = window;
        const map = new kakao.maps.Map(baseMap.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 3,
        });
        setMapStatus("ready");

        // 위치가 이미 도착했으면 바로, 아직이면 도착하는 대로 옮긴다.
        void locationPromise.then((result) => {
          if (cancelled || result.status !== "success") return;
          map.setCenter(new kakao.maps.LatLng(result.latLng.lat, result.latLng.lng));
        });
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const showMapStatus = mapStatus === "ready" && locationStatus !== "success";

  return (
    <div className={`page ${styles.map}`}>
      {mapStatus !== "error" ? (
        <div ref={baseMap} className={styles.baseMap} />
      ) : (
        <div className={styles.errorSection}>
          <p className="body-l-medium text-tertiary">지도를 불러오지 못했어요</p>
        </div>
      )}

      <section className={styles.mapControlSection}>
        {showMapStatus && (
          <p className={`caption-m-medium text-secondary ${styles.locationBadge}`} role="status">
            {LOCATION_MESSAGE[locationStatus]}
          </p>
        )}
      </section>
    </div>
  );
}
