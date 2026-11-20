import { Toast } from "@base-ui/react/toast";
import { useEffect } from "react";

import { requestNativeAppUpdateApply } from "@/shared/api/bridge/nativeBridge";
import type { AppToastData } from "@/shared/commons/toast/toastManager";

const APP_UPDATE_READY_EVENT_NAME = "MELO_APP_UPDATE_READY";
const APP_UPDATE_TOAST_ID = "app-update-ready";

const SHOW_APP_UPDATE_TOAST = false;

export function AppUpdateToastBridge() {
  const { add } = Toast.useToastManager<AppToastData>();

  useEffect(() => {
    if (!SHOW_APP_UPDATE_TOAST) return;

    const showToast = () => {
      add({
        id: APP_UPDATE_TOAST_ID,
        title: "새로운 업데이트가 준비됐어요",
        timeout: 0,
        actionProps: {
          children: "새로고침",
          onClick: requestNativeAppUpdateApply,
        },
        data: {
          dismissible: true,
          position: "bottom",
        },
      });
    };

    if (window.__MELO_APP_UPDATE_READY__) {
      showToast();
      return;
    }

    window.addEventListener(APP_UPDATE_READY_EVENT_NAME, showToast, { once: true });

    return () => {
      window.removeEventListener(APP_UPDATE_READY_EVENT_NAME, showToast);
    };
  }, [add]);

  return null;
}
