import { Toast } from "@base-ui/react/toast";
import { useEffect, useSyncExternalStore } from "react";

import type { AppToastData } from "@/shared/commons/toast/toastManager";

import { getHasVitePreloadError, subscribeVitePreloadError } from "./vitePreloadError";

const VITE_PRELOAD_ERROR_TOAST_ID = "vite-preload-error";

export function VitePreloadErrorToastBridge() {
  const hasPreloadError = useSyncExternalStore(
    subscribeVitePreloadError,
    getHasVitePreloadError,
    getHasVitePreloadError,
  );
  const { add } = Toast.useToastManager<AppToastData>();

  useEffect(() => {
    if (!hasPreloadError) return;

    add({
      id: VITE_PRELOAD_ERROR_TOAST_ID,
      title: "새로고침이 필요해요",
      description: "최신 화면을 불러오려면 새로고침해 주세요.",
      priority: "high",
      timeout: 0,
      actionProps: {
        children: "새로고침",
        onClick: () => window.location.reload(),
      },
      data: {
        dismissible: false,
        position: "bottom",
      },
    });
  }, [add, hasPreloadError]);

  return null;
}
