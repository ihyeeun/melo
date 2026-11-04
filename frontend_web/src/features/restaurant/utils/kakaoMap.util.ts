export type KakaoMap = {
  setCenter: (position: unknown) => void;
  setBounds: (bounds: unknown, top: number, right: number, bottom: number, left: number) => void;
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

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => { extend: (position: unknown) => void };
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
              callback: (
                result: KakaoPlace[],
                status: string,
                pagination: { hasNextPage: boolean },
              ) => void,
              options?: {
                location?: unknown;
                radius?: number;
                sort?: string;
                size?: number;
                page?: number;
              },
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
