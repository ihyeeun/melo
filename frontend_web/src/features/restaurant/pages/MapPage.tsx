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
import {
  useNearbyRestaurantsQuery,
  useRestaurantBrandsQuery,
} from "@/features/restaurant/hooks/queries/restaurant.query";
import { useCurrentLocation } from "@/features/restaurant/hooks/useCurrentLocation";
import {
  getSheetHeight,
  type SheetRestaurant,
  useMapSheet,
} from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/MapPage.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import { getRestaurantDistance } from "@/features/restaurant/utils/distance.util";
import {
  getMapCenterForVisibleArea,
  getVisibleAreaCenter,
  type KakaoMap,
  loadKakaoMapSdk,
} from "@/features/restaurant/utils/kakaoMap.util";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { requestNativeAppSettingsOpen } from "@/shared/api/bridge/nativeBridge";
import { useNativeAppFeature } from "@/shared/api/bridge/useNativeAppFeature";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { SearchInput } from "@/shared/commons/input/SearchInput";
import { navigate } from "@/shared/navigation/stackflowNavigation";
import { dismissKeyboard } from "@/shared/utils/keyboard.util";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const CATEGORY = "RESTAURANT" as const;

// restaurant_search: 검색을 실행한 방법과 그때의 검색어
type SearchRequest = { id: number; trigger: "keyboard" | "map_button"; query: string };

// screen: RES-01-001
export default function MapPage() {
  const canOpenAppSettings = useNativeAppFeature("OPEN_APP_SETTINGS");
  const baseMap = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<KakaoMap | null>(null);
  const [isMapError, setIsMapError] = useState(false);
  const { center, myLocation, status, retry } = useCurrentLocation(DEFAULT_CENTER);
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const searchBarRef = useRef<HTMLDivElement>(null);
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const { currentView, snapPoint, setSnapPoint, moveSheet } = useMapSheet(sheetBodyRef);
  const detailRestaurant = currentView.type === "detail" ? currentView.restaurant : null;
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [mapSearchCenter, setMapSearchCenter] = useState<LatLng | null>(null);
  // 검색 중에 [현재 위치]를 누르면 검색한 기준점을 붙잡아 둬서, 지도만 옮기고 검색 결과는 그대로 둔다.
  const [pinnedSearchCenter, setPinnedSearchCenter] = useState<LatLng | null>(null);
  const searchCenter = (searchKeyword ? pinnedSearchCenter : null) ?? mapSearchCenter ?? center;
  const restaurantSearch = { category: CATEGORY, center: searchCenter, keyword: searchKeyword };
  // 목록과 같은 쿼리라 요청은 한 번만 나간다. 카카오가 거리순으로 주므로 첫 번째가 가장 가깝다.
  const { data: searchResult, isFetching: isSearching } = useNearbyRestaurantsQuery(
    CATEGORY,
    searchCenter,
    searchKeyword,
  );
  const nearestResult = searchKeyword ? searchResult?.[0] : undefined;
  // 목록 · 마커와 같은 쿼리라 요청은 한 번만 나간다
  const brandByPlaceId = useRestaurantBrandsQuery(searchResult?.map(({ id }) => id) ?? []);
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
  const trackedSearchIdRef = useRef<number | null>(null);

  // 검색창과 시트가 가리는 높이. 다 펼친 시트는 지도를 모두 가리므로, 다시 내렸을 때(중간 높이)를 기준으로 한다.
  const getHiddenMapHeight = (sheetSnapPoint: SheetSnapPoint = snapPoint) => ({
    top: searchBarRef.current?.getBoundingClientRect().bottom ?? 0,
    bottom: getSheetHeight(sheetSnapPoint === 1 ? DEFAULT_SNAP_POINT : sheetSnapPoint),
  });

  const moveMapToVisibleCenter = (position: LatLng) => {
    if (map) map.setCenter(getMapCenterForVisibleArea(map, position, getHiddenMapHeight()));
  };

  // 검색어를 지우면 지도가 검색 전 기준점으로 돌아가 목록과 맞으므로 [현 지도에서 검색]을 내린다.
  // 결과를 받기 전에 지웠으면 그 검색은 restaurant_search로 남기지 않는다.
  const clearSearchKeyword = () => {
    setSearchKeyword("");
    setIsMapMoved(false);
    setSearchRequest(null);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (!value.trim() && searchKeyword) clearSearchKeyword();
  };

  // 지도는 옮기지 않는다. 검색하면 시트가 목록 높이로 바뀌므로, 그때 보이는 영역의 가운데를 기준으로 찾는다.
  const setSearchCenterToMapArea = () => {
    if (map) {
      setMapSearchCenter(getVisibleAreaCenter(map, getHiddenMapHeight(SHEET_VIEW_SNAP.list)));
    }
  };

  const handleSearchSubmit = (value: string) => {
    // 지도를 끌어 옮긴 뒤 검색하면 옮긴 지도에서 찾는다.
    if (isMapMoved) setSearchCenterToMapArea();
    setPinnedSearchCenter(null);
    setSearchKeyword(value.trim());
    setIsMapMoved(false);
    setSearchRequest({ id: Date.now(), trigger: "keyboard", query: value.trim() });
    moveSheet({ type: "submit_search" });
  };

  const handleSearchMapArea = () => {
    if (!map) return;

    setSearchCenterToMapArea();
    setPinnedSearchCenter(null);
    setIsMapMoved(false);
    setSearchRequest({ id: Date.now(), trigger: "map_button", query: searchKeyword });
    moveSheet({ type: "search_map_area" });
  };

  // 검색 결과와 멜로 등록 여부까지 받은 뒤 한 번 남긴다
  useEffect(() => {
    if (!searchRequest || trackedSearchIdRef.current === searchRequest.id) return;
    if (isSearching || !searchResult) return;
    if (!searchResult.every(({ id }) => brandByPlaceId.has(id))) return;

    trackedSearchIdRef.current = searchRequest.id;
    track(EVENT_NAME.RESTAURANT_SEARCH, {
      trigger: searchRequest.trigger,
      query: searchRequest.query,
      result_count: searchResult.length,
      registered_count: searchResult.filter(({ id }) => brandByPlaceId.get(id)).length,
    });
  }, [searchRequest, isSearching, searchResult, brandByPlaceId]);

  const handleSelectRestaurant = (restaurant: SheetRestaurant, target: "card" | "pin") => {
    track(EVENT_NAME.RESTAURANT_CARD_CLICK, {
      restaurant_name: restaurant.name,
      target,
      // [AI 추정] 식당을 구분하는 값이 응답에 없어 멜로 등록 식당은 모두 franchise로 보낸다
      data_type: restaurant.restaurantId !== null ? "franchise" : "none",
    });
    // 상세 시트 · 식당 메뉴 전체 화면도 목록처럼 내 위치에서 잰 거리를 보여 준다
    const distance = getRestaurantDistance(restaurant, myLocation);
    moveSheet({
      type: target === "pin" ? "click_marker" : "click_restaurant",
      restaurant: { ...restaurant, distance },
    });
  };

  // 다시 물어볼 수 있으면 권한 팝업, 아니면 설정 앱으로. 설정에서 돌아오면 자동으로 다시 확인한다
  const handleAllowLocation = () => {
    if (status === "blocked" && canOpenAppSettings) {
      requestNativeAppSettingsOpen();
      return;
    }

    handleMoveToMyLocation();
  };

  // 검색 중이면 검색 결과는 그대로 두고 지도만 옮긴다. 지도가 목록과 달라지므로 [현 지도에서 검색]을 띄운다.
  const handleMoveToMyLocation = () => {
    if (searchKeyword) setPinnedSearchCenter(searchCenter);
    setMapSearchCenter(null);
    setIsMapMoved(searchKeyword !== "");
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
    const handleMapMoved = () => setIsMapMoved(true);

    // 코드로 옮길 때(setCenter · panTo)는 발생하지 않아서, 사용자가 지도를 끌거나 확대 · 축소했을 때만 버튼이 나타난다.
    event.addListener(map, "dragend", handleMapMoved);
    event.addListener(map, "zoom_changed", handleMapMoved);
    return () => {
      event.removeListener(map, "dragend", handleMapMoved);
      event.removeListener(map, "zoom_changed", handleMapMoved);
    };
  }, [map]);

  const moveToSearchCenter = useEffectEvent(() => {
    // 검색어로 찾을 때는 결과가 온 뒤 가장 가까운 식당으로 옮긴다.
    // 검색 중에 [현재 위치]를 눌렀으면 결과는 그대로 두고, 새로 받은 내 위치로 옮긴다.
    const target = searchKeyword ? pinnedSearchCenter && center : searchCenter;
    if (target) moveMapToVisibleCenter(target);
  });

  // 내 위치를 받았거나 검색어를 지우면 검색 기준점으로 지도를 옮긴다.
  // '현 지도에서 검색'은 사용자가 맞춰 둔 지도에서 찾는 것이라 옮기지 않는다.
  useEffect(() => {
    moveToSearchCenter();
  }, [map, center, searchKeyword]);

  const moveToNearestResult = useEffectEvent((restaurant: LatLng) => {
    moveMapToVisibleCenter(restaurant);
  });

  // 검색어로 찾으면 확대 수준은 그대로 두고, 가장 가까운 식당을 보이는 영역 가운데로 옮긴다.
  useEffect(() => {
    if (nearestResult) moveToNearestResult(nearestResult);
  }, [map, nearestResult]);

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
        {map && status === "locating" && (
          <div className={styles.locationBadge}>
            <p className="caption-m-medium text-secondary" role="status">
              현재 위치를 찾는 중이에요
            </p>
          </div>
        )}
      </section>

      {/* 위치 권한 거부 · 위치 확인 실패 (기획 초안 4458:37146 · 4458:37281) */}
      {map && (status === "denied" || status === "blocked" || status === "unavailable") && (
        <div className={styles.locationCard} role="status">
          <p className="body-l-medium text-primary textCenter">
            {status === "unavailable"
              ? "현재 위치를 확인하지 못했어요"
              : "위치 권한을 허용하면\n내 주변 식당을 볼 수 있어요"}
          </p>
          <Button
            size="s"
            fullWidth
            onClick={status === "unavailable" ? handleMoveToMyLocation : handleAllowLocation}
          >
            {status === "unavailable" ? "다시 찾기" : "위치 권한 허용하기"}
          </Button>
        </div>
      )}

      {map && (
        <NearbyRestaurantMarkers
          map={map}
          {...restaurantSearch}
          selectedPlaceId={detailRestaurant?.id ?? null}
          onSelectRestaurant={(restaurant) => handleSelectRestaurant(restaurant, "pin")}
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
        footer={
          detailRestaurant?.restaurantId != null && (
            <Button
              fullWidth
              onClick={() =>
                navigate(`${PATH.RESTAURANT_MENU}?restaurantId=${detailRestaurant.restaurantId}`, {
                  state: detailRestaurant,
                })
              }
            >
              식당 메뉴 전체 보기
            </Button>
          )
        }
      >
        {currentView.type === "list" && (
          <NearbyRestaurantList
            {...restaurantSearch}
            isMapAreaSearch={mapSearchCenter !== null}
            myLocation={myLocation}
            onSelectRestaurant={(restaurant) => handleSelectRestaurant(restaurant, "card")}
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
