import { useEffect } from "react";

import styles from "@/features/restaurant/styles/MyLocationMarker.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import type { KakaoMap } from "@/features/restaurant/utils/kakaoMap.util";

type MyLocationMarkerProps = {
  map: KakaoMap;
  position: LatLng;
};

export default function MyLocationMarker({ map, position }: MyLocationMarkerProps) {
  useEffect(() => {
    const { maps } = window.kakao;
    const overlay = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(position.lat, position.lng),
      content: `<div class="${styles.myLocation}"></div>`,
      zIndex: 3,
    });

    return () => overlay.setMap(null);
  }, [map, position]);

  return null;
}
