import { useEffect, useEffectEvent, useRef, useState } from "react";

import MapBottomSheet, {
  DEFAULT_SNAP_POINT,
  type SheetSnapPoint,
} from "@/features/restaurant/components/map/MapBottomSheet";
import NearbyRestaurantList from "@/features/restaurant/components/map/NearbyRestaurantList";
import RestaurantDetailSheet from "@/features/restaurant/components/map/RestaurantDetailSheet";
import MyLocationMarker from "@/features/restaurant/components/markers/MyLocationMarker";
import NearbyRestaurantMarkers from "@/features/restaurant/components/markers/NearbyRestaurantMarkers";
import { SHEET_VIEW_SNAP } from "@/features/restaurant/constants/mapSheet.policy";
import { useCurrentLocation } from "@/features/restaurant/hooks/useCurrentLocation";
import { getSheetHeight, useMapSheet } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/MapPage.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import {
  getMapCenterForVisibleArea,
  getVisibleAreaCenter,
  type KakaoMap,
  loadKakaoMapSdk,
} from "@/features/restaurant/utils/kakaoMap.util";
import { dismissKeyboard } from "@/features/restaurant/utils/keyboard.util";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
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
  const searchBarRef = useRef<HTMLDivElement>(null);
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const { currentView, snapPoint, setSnapPoint, moveSheet } = useMapSheet(sheetBodyRef);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [mapSearchCenter, setMapSearchCenter] = useState<LatLng | null>(null);
  const searchCenter = mapSearchCenter ?? center;
  const restaurantSearch = { category: CATEGORY, center: searchCenter, keyword: searchKeyword };

  // 검색창과 시트가 가리는 높이. 다 펼친 시트는 지도를 모두 가리므로, 다시 내렸을 때(중간 높이)를 기준으로 한다.
  const getHiddenMapHeight = (sheetSnapPoint: SheetSnapPoint = snapPoint) => ({
    top: searchBarRef.current?.getBoundingClientRect().bottom ?? 0,
    bottom: getSheetHeight(sheetSnapPoint === 1 ? DEFAULT_SNAP_POINT : sheetSnapPoint),
  });

  const moveMapToVisibleCenter = (position: LatLng) => {
    if (map) map.setCenter(getMapCenterForVisibleArea(map, position, getHiddenMapHeight()));
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (!value.trim()) setSearchKeyword("");
  };

  const handleSearchSubmit = (value: string) => {
    setSearchKeyword(value.trim());
    setIsMapMoved(false);
    moveSheet({ type: "submit_search" });
  };

  const handleSearchMapArea = () => {
    if (!map) return;

    // 지도는 옮기지 않는다. 검색하면 시트가 목록 높이로 바뀌므로, 그때 보이는 영역의 가운데를 기준으로 찾는다.
    setMapSearchCenter(getVisibleAreaCenter(map, getHiddenMapHeight(SHEET_VIEW_SNAP.list)));
    setIsMapMoved(false);
    moveSheet({ type: "search_map_area" });
  };

  const handleMoveToMyLocation = () => {
    setMapSearchCenter(null);
    setIsMapMoved(false);
    // 위치를 다시 받기 전까지는 마지막으로 받은 위치로 먼저 옮긴다.
    if (center) moveMapToVisibleCenter(center);
    retry();
  };

  // 시트를 끌 때마다 다시 옮기지 않도록, 상세를 연 시점의 시트 높이만 읽는다.
  const panToRestaurant = useEffectEvent((restaurant: LatLng) => {
    if (map) map.panTo(getMapCenterForVisibleArea(map, restaurant, getHiddenMapHeight()));
  });

  // 식당이나 마커를 눌러 상세를 열면, 검색창과 시트에 가리지 않는 영역의 가운데로 그 식당을 옮긴다.
  useEffect(() => {
    if (currentView.type === "detail") panToRestaurant(currentView.restaurant);
  }, [currentView]);

  useEffect(() => {
    if (!map) return;

    const { event } = window.kakao.maps;
    const handleMapDragEnd = () => setIsMapMoved(true);

    // 코드로 옮길 때는 발생하지 않아서, 사용자가 지도를 끌었을 때만 버튼이 나타난다.
    event.addListener(map, "dragend", handleMapDragEnd);
    return () => event.removeListener(map, "dragend", handleMapDragEnd);
  }, [map]);

  const moveToSearchCenter = useEffectEvent(() => {
    if (searchCenter) moveMapToVisibleCenter(searchCenter);
  });

  // 내 위치를 받았거나 검색어가 바뀌면 검색 기준점으로 지도를 옮긴다.
  // '현 지도에서 검색'은 사용자가 맞춰 둔 지도에서 찾는 것이라 옮기지 않는다.
  useEffect(() => {
    moveToSearchCenter();
  }, [map, center, searchKeyword]);

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
            level: 2,
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
        <div ref={baseMap} className={styles.baseMap} onPointerDownCapture={dismissKeyboard} />
      )}

      <section className={styles.mapControlSection}>
        <div ref={searchBarRef} className={styles.searchBar}>
          <SearchInput
            value={searchInput}
            onValueChange={handleSearchInputChange}
            onEnter={handleSearchSubmit}
            debounceMs={null}
            placeholder="식당을 검색해보세요"
            showSearchIcon
            inputClassName="amp-unmask"
          />
        </div>
        {map && isMapMoved && (
          <button
            type="button"
            className={`body-s-medium text-primary ${styles.mapActionButton}`}
            onClick={handleSearchMapArea}
          >
            <SystemIcon name="refresh" size={20} className="text-highlight" />현 지도에서 검색
          </button>
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

      {map && (
        <NearbyRestaurantMarkers
          map={map}
          {...restaurantSearch}
          selectedPlaceId={currentView.type === "detail" ? currentView.restaurant.id : null}
          onSelectRestaurant={(restaurant) => moveSheet({ type: "click_marker", restaurant })}
        />
      )}
      {map && myLocation && <MyLocationMarker map={map} position={myLocation} />}

      <MapBottomSheet
        snapPoint={snapPoint}
        onSnapPointChange={setSnapPoint}
        scrollResetKey={searchKeyword}
        bodyRef={sheetBodyRef}
        floatingAction={
          map && (
            <button
              type="button"
              className={styles.currentLocationButton}
              aria-label="현재 위치로 이동"
              onClick={handleMoveToMyLocation}
            >
              <SystemIcon name="location-searching" />
            </button>
          )
        }
      >
        {currentView.type === "list" && (
          <NearbyRestaurantList
            {...restaurantSearch}
            isMapAreaSearch={mapSearchCenter !== null}
            onSelectRestaurant={(restaurant) => moveSheet({ type: "click_restaurant", restaurant })}
          />
        )}
        {currentView.type === "detail" && (
          <RestaurantDetailSheet
            restaurant={currentView.restaurant}
            onBack={() => moveSheet({ type: "back" })}
          />
        )}
      </MapBottomSheet>
    </div>
  );
}
