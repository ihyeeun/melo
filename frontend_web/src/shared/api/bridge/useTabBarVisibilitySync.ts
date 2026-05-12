import { useEffect } from "react";

import { beginTabBarVisibilitySync } from "@/shared/api/bridge/nativeBridge";

export function useTabBarVisibilitySync(isHidden: boolean) {
  useEffect(() => {
    if (!isHidden) return;

    return beginTabBarVisibilitySync();
  }, [isHidden]);
}
