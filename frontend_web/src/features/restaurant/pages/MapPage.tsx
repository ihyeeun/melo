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
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
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
  const { center, myLocation, status, retry } = useCurrentLocation(DEFAULT_CENTER);
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sheetSnapPoint, setSheetSnapPoint] = useState<SheetSnapPoint>(DEFAULT_SNAP_POINT);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [mapSearchCenter, setMapSearchCenter] = useState<LatLng | null>(null);
  const searchCenter = mapSearchCenter ?? center;
  const restaurantSearch = { category: CATEGORY, center: searchCenter, keyword: searchKeyword };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (!value.trim()) setSearchKeyword("");
  };

  const handleSearchSubmit = (value: string) => {
    setSearchKeyword(value.trim());
    setIsMapMoved(false);
    setSheetSnapPoint(DEFAULT_SNAP_POINT);
  };

  const handleSearchMapArea = () => {
    if (!map) return;

    const mapCenter = map.getCenter();
    setMapSearchCenter({ lat: mapCenter.getLat(), lng: mapCenter.getLng() });
    setIsMapMoved(false);
    setSheetSnapPoint(DEFAULT_SNAP_POINT);
  };

  const handleMoveToMyLocation = () => {
    setMapSearchCenter(null);
    setIsMapMoved(false);
    retry();
  };

  useEffect(() => {
    if (!map) return;

    const { event } = window.kakao.maps;
    const handleMapDragEnd = () => setIsMapMoved(true);

    // 코드로 옮길 때는 발생하지 않아서, 사용자가 지도를 끌었을 때만 버튼이 나타난다.
    event.addListener(map, "dragend", handleMapDragEnd);
    return () => event.removeListener(map, "dragend", handleMapDragEnd);
  }, [map]);

  // 검색 기준점이 바뀌거나 새로 검색하면 지도를 그 위치로 옮긴다.
  useEffect(() => {
    if (!map || !searchCenter) return;

    const { maps } = window.kakao;
    map.setCenter(new maps.LatLng(searchCenter.lat, searchCenter.lng));
  }, [map, searchCenter, searchKeyword]);

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
            level: 1,
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
        {map && (
          <div className={styles.mapActions}>
            <button
              type="button"
              className={`caption-m-semi text-primary ${styles.mapActionButton}`}
              onClick={handleMoveToMyLocation}
            >
              현재 위치
            </button>
            {isMapMoved && (
              <button
                type="button"
                className={`caption-m-semi text-primary ${styles.mapActionButton}`}
                onClick={handleSearchMapArea}
              >
                현 지도에서 검색
              </button>
            )}
          </div>
        )}
        {map && status !== "success" && (
          <div className={styles.locationBadge}>
            <p className="caption-m-medium text-secondary" role="status">
              {LOCATION_MESSAGE[status]}
            </p>
            {status !== "locating" && (
              <button
                type="button"
                className={`caption-m-semi ${styles.retryButton}`}
                onClick={handleMoveToMyLocation}
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
