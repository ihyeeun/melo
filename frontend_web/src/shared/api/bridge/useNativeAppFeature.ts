import { useQuery } from "@tanstack/react-query";

import { getNativeAppSupportedFeatures } from "./nativeBridge";
import type { AppFeature } from "./nativeBridge.types";

// 앱이 이 브리지 기능을 지원하는지. 확인 전이거나 옛 앱이면 false라서 그동안은 지금 화면을 그대로 보여 준다
export function useNativeAppFeature(feature: AppFeature) {
  const { data: supportedFeatures } = useQuery({
    queryKey: ["native-app", "supported-features"],
    queryFn: getNativeAppSupportedFeatures,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return supportedFeatures?.includes(feature) ?? false;
}
