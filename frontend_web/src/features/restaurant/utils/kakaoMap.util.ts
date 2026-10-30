declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level?: number },
        ) => { setCenter: (position: unknown) => void };
      };
    };
  }
}

const SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false`;

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
