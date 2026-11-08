import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";

// 지도 엘리먼트 좌상단 기준 화면 좌표(px)
type KakaoPoint = { x: number; y: number };
type KakaoLatLng = { getLat: () => number; getLng: () => number };

export type KakaoMap = {
  setCenter: (position: unknown) => void;
  getCenter: () => KakaoLatLng;
  panTo: (position: unknown) => void;
  getProjection: () => {
    containerPointFromCoords: (position: unknown) => KakaoPoint;
    coordsFromContainerPoint: (point: KakaoPoint) => KakaoLatLng;
  };
};

// 지도에서 위(검색창)와 아래(시트)가 UI에 가려진 높이(px)
export type HiddenMapHeight = { top: number; bottom: number };

// 지도 위에 올린 객체. setMap(null)로 지운다.
type KakaoMapObject = {
  setMap: (map: KakaoMap | null) => void;
};

export type KakaoPlace = {
  id: string;
  place_name: string;
  category_name: string;
  x: string;
  y: string;
  distance: string;
};

export type KakaoPlacesCallback = (
  places: KakaoPlace[],
  status: string,
  pagination: { hasNextPage: boolean },
) => void;

type KakaoPlacesOptions = {
  location?: unknown;
  radius?: number;
  sort?: string;
  size?: number;
  page?: number;
  category_group_code?: string;
};

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        event: {
          addListener: (
            target: KakaoMap | KakaoMapObject,
            type: string,
            handler: () => void,
          ) => void;
          removeListener: (
            target: KakaoMap | KakaoMapObject,
            type: string,
            handler: () => void,
          ) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Point: new (x: number, y: number) => KakaoPoint;
        Map: new (container: HTMLElement, options: { center: unknown; level?: number }) => KakaoMap;
        Marker: new (options: {
          map: KakaoMap;
          position: unknown;
          title?: string;
        }) => KakaoMapObject;
        CustomOverlay: new (options: {
          map: KakaoMap;
          position: unknown;
          content: string;
          zIndex?: number;
        }) => KakaoMapObject;
        services: {
          Places: new () => {
            categorySearch: (
              categoryCode: string,
              callback: KakaoPlacesCallback,
              options?: KakaoPlacesOptions,
            ) => void;
            keywordSearch: (
              keyword: string,
              callback: KakaoPlacesCallback,
              options?: KakaoPlacesOptions,
            ) => void;
          };
          Status: { OK: string; ZERO_RESULT: string };
          SortBy: { DISTANCE: string };
        };
      };
    };
  }
}

const SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false&libraries=services`;

let sdkLoadPromise: Promise<void> | null = null;

export function loadKakaoMapSdk() {
  sdkLoadPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => {
      sdkLoadPromise = null;
      script.remove();
      reject(new Error("지도를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

// position이 보이는 영역의 가운데에 오려면 지도 가운데를 어디로 잡아야 하는지 구한다.
export function getMapCenterForVisibleArea(
  map: KakaoMap,
  position: LatLng,
  hidden: HiddenMapHeight,
) {
  const { maps } = window.kakao;
  const projection = map.getProjection();
  const point = projection.containerPointFromCoords(new maps.LatLng(position.lat, position.lng));

  // 지도 가운데를 position보다 (bottom - top) / 2 만큼 아래로 잡으면, position이 보이는 영역의 가운데에 온다.
  return projection.coordsFromContainerPoint(
    new maps.Point(point.x, point.y + (hidden.bottom - hidden.top) / 2),
  );
}

// 지금 보이는 영역의 가운데 좌표를 구한다. getMapCenterForVisibleArea의 반대 계산이다.
export function getVisibleAreaCenter(map: KakaoMap, hidden: HiddenMapHeight): LatLng {
  const { maps } = window.kakao;
  const projection = map.getProjection();
  const center = projection.containerPointFromCoords(map.getCenter());
  const visibleCenter = projection.coordsFromContainerPoint(
    new maps.Point(center.x, center.y + (hidden.top - hidden.bottom) / 2),
  );

  return { lat: visibleCenter.getLat(), lng: visibleCenter.getLng() };
}
