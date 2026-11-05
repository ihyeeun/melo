import { useEffect, useRef, useState } from "react";

import MapBottomSheet, {
  DEFAULT_SNAP_POINT,
  type SheetSnapPoint,
} from "@/features/restaurant/components/map/MapBottomSheet";
import NearbyRestaurantList from "@/features/restaurant/components/map/NearbyRestaurantList";
import MyLocationMarker from "@/features/restaurant/components/markers/MyLocationMarker";
import NearbyRestaurantMarkers from "@/features/restaurant/components/markers/NearbyRestaurantMarkers";
import { useCurrentLocation } from "@/features/restaurant/hooks/useCurrentLocation";
import styles from "@/features/restaurant/styles/MapPage.module.css";
import { type KakaoMap, loadKakaoMapSdk } from "@/features/restaurant/utils/kakaoMap.util";
import { SearchInput } from "@/shared/commons/input/SearchInput";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const CATEGORY = "RESTAURANT" as const;

const LOCATION_MESSAGE = {
  locating: "현재 위치를 찾는 중이에요",
  denied: "설정에서 위치 권한을 허용하면 내 주변을 볼 수 있어요",
  unavailable: "현재 위치를 확인하지 못했어요",
};

export default function MapPage() {
  const baseMap = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<KakaoMap | null>(null);
  const [isMapError, setIsMapError] = useState(false);
  // 지도와 위치는 각자 요청한다. 위치가 늦어도 지도는 기다리지 않는다.
  const { center, status, retry } = useCurrentLocation(DEFAULT_CENTER);
  // center는 실패하면 기본 위치가 되므로, 실제 위치를 받았을 때만 내 위치로 표시한다.
  const myLocation = status === "success" ? center : null;
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sheetSnapPoint, setSheetSnapPoint] = useState<SheetSnapPoint>(DEFAULT_SNAP_POINT);
  // 목록과 마커가 항상 같은 쿼리를 보도록 조건을 한곳에서 묶어 넘긴다.
  const restaurantSearch = { category: CATEGORY, center, keyword: searchKeyword };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    // 검색어를 모두 지우면 주변 식당으로 돌아간다.
    if (!value.trim()) setSearchKeyword("");
  };

  const handleSearchSubmit = (value: string) => {
    setSearchKeyword(value.trim());
    // 시트를 접거나 펼쳐 둔 상태에서도 지도와 결과가 함께 보이게 한다.
    setSheetSnapPoint(DEFAULT_SNAP_POINT);
  };

  useEffect(() => {
    let cancelled = false;

    loadKakaoMapSdk()
      .then(() => {
        // 로딩 중에 화면을 떠났으면 지도를 만들지 않는다.
        if (cancelled || !baseMap.current) return;

        const { kakao } = window;
        setMap(
          new kakao.maps.Map(baseMap.current, {
            center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
            level: 3,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setIsMapError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`page ${styles.map}`}>
      {isMapError ? (
        <div className={styles.errorSection}>
          <p className="body-l-medium text-tertiary">지도를 불러오지 못했어요</p>
        </div>
      ) : (
        <div ref={baseMap} className={styles.baseMap} />
      )}

      <section className={styles.mapControlSection}>
        <div className={styles.searchBar}>
          <SearchInput
            value={searchInput}
            onValueChange={handleSearchInputChange}
            onEnter={handleSearchSubmit}
            debounceMs={null}
            placeholder="식당 검색"
            inputClassName="amp-unmask"
          />
        </div>
        {map && status !== "success" && (
          <div className={styles.locationBadge}>
            <p className="caption-m-medium text-secondary" role="status">
              {LOCATION_MESSAGE[status]}
            </p>
            {status !== "locating" && (
              <button
                type="button"
                className={`caption-m-semi ${styles.retryButton}`}
                onClick={retry}
              >
                다시 찾기
              </button>
            )}
          </div>
        )}
      </section>

      {map && <NearbyRestaurantMarkers map={map} {...restaurantSearch} />}
      {map && myLocation && <MyLocationMarker map={map} position={myLocation} />}

      <MapBottomSheet
        snapPoint={sheetSnapPoint}
        onSnapPointChange={setSheetSnapPoint}
        scrollResetKey={searchKeyword}
      >
        <NearbyRestaurantList {...restaurantSearch} />
      </MapBottomSheet>
    </div>
  );
}
