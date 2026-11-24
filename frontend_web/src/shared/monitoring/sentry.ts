import * as Sentry from "@sentry/react";

import { getAnalyticsUserId } from "@/shared/analytics/analytics";
import { AppApiError } from "@/shared/api/apiClient";
import { isNativeApp, requestNativeAppDeviceInfo } from "@/shared/api/bridge/nativeBridge";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

// 화면 이동에 쓰는 쿼리만 값을 남기고, 나머지(로그인 code, 지도 좌표 등)는 [Filtered]로 바꾼다.
// 이름의 일부만 맞아도 남으므로 "id"가 restaurantId · menuId 등을 함께 덮는다.
const URL_QUERY_PARAMS_TO_KEEP = ["date", "mealType", "mode", "step", "id"];

function toConsoleBreadcrumbMessage(args: unknown) {
  const [label] = Array.isArray(args) ? args : [];
  if (typeof label === "string") return label;
  if (label instanceof Error) return `${label.name}: ${label.message}`;

  return undefined;
}

async function setAppDeviceTags() {
  try {
    const info = await requestNativeAppDeviceInfo();
    Sentry.setTags({
      app_version: info.appVersion,
      app_build: info.appBuild ?? undefined,
      os: info.osName,
      os_version: info.osVersion ?? undefined,
    });
  } catch {
    // 이 요청을 모르는 옛 앱은 앱 정보 없이 보낸다
  }
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: import.meta.env.PROD && Boolean(dsn),
    environment: import.meta.env.VITE_VERCEL_ENV ?? "production",
    dataCollection: {
      userInfo: false,
      httpHeaders: { request: { allow: ["user-agent"] }, response: false },
      urlQueryParams: { allow: URL_QUERY_PARAMS_TO_KEEP },
    },
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (isRequestAbortError(error)) return null;
      // API 실패는 앱이 기록한다. 화면 전체가 깨진 경우만 웹에서도 남긴다
      if (error instanceof AppApiError && event.tags?.error_boundary !== "app") return null;

      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category !== "console") return breadcrumb;

      // 콘솔 인자에는 응답 데이터가 섞일 수 있어 첫 문구만 남긴다
      return {
        ...breadcrumb,
        message: toConsoleBreadcrumbMessage(breadcrumb.data?.arguments),
        data: undefined,
      };
    },
  });

  Sentry.setTag("runtime", isNativeApp() ? "webview" : "browser");
  if (isNativeApp()) {
    void setAppDeviceTags();
  }
}

export function setSentryUser(profile: ProfileResponseDto) {
  Sentry.setUser({ id: getAnalyticsUserId(profile.user_id) });
  Sentry.setTag("user_role", profile.role);
}

export function clearSentryUser() {
  Sentry.setUser(null);
  Sentry.setTag("user_role", undefined);
}
