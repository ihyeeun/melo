export type KakaoMap = {
  setCenter: (position: unknown) => void;
  getCenter: () => { getLat: () => number; getLng: () => number };
};

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
          addListener: (target: KakaoMap, type: string, handler: () => void) => void;
          removeListener: (target: KakaoMap, type: string, handler: () => void) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
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
