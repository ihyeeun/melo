import { createRequestAbortError } from "@/shared/api/requestCancellation";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";

import type {
  ApiRequestPayload,
  AppDeviceInfoPayload,
  AppTabName,
  AppToWebMessage,
  CameraCaptureRequestPayload,
  CameraCaptureResponsePayload,
  GalleryPickRequestPayload,
  HapticType,
  HealthPermissionResponsePayload,
  HealthStepCountResponsePayload,
  HealthStepsReadRequestPayload,
  ImageUploadRequestPayload,
  InAppBrowserOpenResponsePayload,
  WebToAppMessage,
} from "./nativeBridge.types";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  cleanup: () => void;
};

const pendingRequests = new Map<string, PendingRequest>();
const activeTabBarVisibilitySyncIds = new Set<string>();
const MESSAGE_TYPES_REQUIRING_NAV_CONTEXT = new Set<WebToAppMessage["type"]>([
  "TAB_SYNC",
  "NAVIGATION_BACK",
]);
const CLICK_HAPTIC_TARGET_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='tab']",
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "input[type='checkbox']",
  "input[type='radio']",
  "select",
  "[data-native-haptic]",
].join(",");
const CLICK_HAPTIC_DISABLED_SELECTOR =
  "[disabled], [aria-disabled='true'], [data-native-haptic='off']";

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isNativeApp() {
  return typeof window !== "undefined" && !!window.ReactNativeWebView;
}

function getSanitizedCurrentHref() {
  if (typeof window === "undefined") return undefined;

  try {
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.origin}${currentUrl.pathname}`;
  } catch {
    return undefined;
  }
}

function postMessageToApp(message: WebToAppMessage) {
  if (!isNativeApp()) {
    throw new Error("현재 앱 브리지를 사용할 수 없는 환경입니다.");
  }

  const shouldAttachNavigationContext = MESSAGE_TYPES_REQUIRING_NAV_CONTEXT.has(message.type);
  const sanitizedHref = shouldAttachNavigationContext ? getSanitizedCurrentHref() : undefined;
  const context =
    sanitizedHref !== undefined
      ? {
          ...message.context,
          href: sanitizedHref,
        }
      : message.context;
  const messageWithContext: WebToAppMessage = context ? { ...message, context } : message;

  window.ReactNativeWebView!.postMessage(JSON.stringify(messageWithContext));
}

export function initNativeBridgeListener() {
  const handleMessage: EventListener = (event) => {
    try {
      const rawData = (event as MessageEvent).data;
      if (typeof rawData !== "string") return;

      const parsed: AppToWebMessage = JSON.parse(rawData);
      if (typeof parsed.id !== "string") return;
      if (parsed.type !== "API_RESPONSE" && parsed.type !== "API_ERROR") return;

      const pending = pendingRequests.get(parsed.id);

      if (!pending) return;

      if (parsed.type === "API_RESPONSE") {
        pending.cleanup();
        pending.resolve(parsed.payload);
      } else {
        const payload = parsed.payload as {
          message?: string;
          statusCode?: number;
          error?: string;
        };
        const bridgeError = new Error(payload?.message ?? "앱 API 요청 실패");
        Object.assign(bridgeError, payload);
        pending.cleanup();
        pending.reject(bridgeError);
      }
    } catch (error) {
      console.error("[Bridge] 메시지 파싱 실패", error);
    }
  };

  window.addEventListener("message", handleMessage);
  document.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
    document.removeEventListener("message", handleMessage);
  };
}

type SendRequestOptions = {
  timeoutMs?: number;
};

function sendRequestToApp<T>(
  messageFactory: (id: string) => WebToAppMessage,
  options?: SendRequestOptions & { cancelNativeRequest?: boolean },
) {
  return new Promise<T>((resolve, reject) => {
    const signal = options?.cancelNativeRequest ? captureScreenRequestScope().signal : undefined;
    if (signal?.aborted) {
      reject(createRequestAbortError());
      return;
    }

    const id = generateRequestId();
    const message = messageFactory(id);
    const timeoutMs = options?.timeoutMs ?? 1 * 60 * 1000;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      pendingRequests.delete(id);
    };

    const cancel = (error: unknown) => {
      if (!pendingRequests.has(id)) return;
      cleanup();
      reject(error);

      if (options?.cancelNativeRequest) {
        try {
          postMessageToApp({ type: "API_CANCEL", id });
        } catch {
          // The WebView may already be gone; local cancellation is still complete.
        }
      }
    };

    const onAbort = () => cancel(createRequestAbortError());

    timeoutId =
      timeoutMs > 0
        ? window.setTimeout(() => {
            cancel({
              message: "앱 응답 시간이 초과되었습니다.",
              statusCode: 408,
              error: "BRIDGE_TIMEOUT",
            });
          }, timeoutMs)
        : null;

    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      cleanup,
    });

    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      postMessageToApp(message);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export function requestToApp<T>(payload: ApiRequestPayload, options?: SendRequestOptions) {
  return sendRequestToApp<T>(
    (id) => ({
      id,
      type: "API_REQUEST",
      payload,
    }),
    { ...options, cancelNativeRequest: true },
  );
}

export function syncAppTab(tab: AppTabName) {
  if (!isNativeApp()) return;

  postMessageToApp({
    id: generateRequestId(),
    type: "TAB_SYNC",
    payload: {
      tab,
    },
  });
}

export function syncAppFeatureGuardEnabled(enabled: boolean) {
  if (!isNativeApp()) return;

  postMessageToApp({
    id: generateRequestId(),
    type: "FEATURE_GUARD_SYNC",
    payload: {
      enabled,
    },
  });
}

function syncTabBarVisibilityToApp(isHidden: boolean) {
  if (!isNativeApp()) return;

  postMessageToApp({
    id: generateRequestId(),
    type: "TAB_BAR_VISIBILITY_SYNC",
    payload: {
      isHidden,
    },
  });
}

export function beginTabBarVisibilitySync() {
  if (!isNativeApp()) {
    return () => {};
  }

  const syncId = generateRequestId();
  let isSyncing = true;
  activeTabBarVisibilitySyncIds.add(syncId);
  syncTabBarVisibilityToApp(true);

  return () => {
    if (!isSyncing) return;

    isSyncing = false;
    activeTabBarVisibilitySyncIds.delete(syncId);
    syncTabBarVisibilityToApp(activeTabBarVisibilitySyncIds.size > 0);
  };
}

export function requestAppBack() {
  if (!isNativeApp()) return;

  postMessageToApp({
    id: generateRequestId(),
    type: "NAVIGATION_BACK",
  });
}

export function triggerNativeHaptic(type: HapticType = "tap") {
  if (!isNativeApp()) return;

  postMessageToApp({
    id: generateRequestId(),
    type: "HAPTIC_TRIGGER_REQUEST",
    payload: {
      type,
    },
  });
}

function resolveClickHapticTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const hapticTarget = target.closest(CLICK_HAPTIC_TARGET_SELECTOR);
  if (!hapticTarget) return null;
  if (hapticTarget.closest(CLICK_HAPTIC_DISABLED_SELECTOR)) return null;

  return hapticTarget;
}

export function initNativeClickHaptics() {
  if (!isNativeApp()) {
    return () => {};
  }

  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (!resolveClickHapticTarget(event.target)) return;

    triggerNativeHaptic("tap");
  };

  document.addEventListener("click", handleClick, true);

  return () => {
    document.removeEventListener("click", handleClick, true);
  };
}

export function requestNativeAppDeviceInfo() {
  return sendRequestToApp<AppDeviceInfoPayload>((id) => ({
    id,
    type: "APP_DEVICE_INFO_REQUEST",
  }));
}

export function requestNativeCameraCapture(payload?: CameraCaptureRequestPayload) {
  return sendRequestToApp<CameraCaptureResponsePayload>(
    (id) => ({
      id,
      type: "CAMERA_CAPTURE_REQUEST",
      payload,
    }),
    {
      timeoutMs: 300000,
    },
  );
}

export function requestNativeGalleryPick(payload?: GalleryPickRequestPayload) {
  return sendRequestToApp<CameraCaptureResponsePayload>(
    (id) => ({
      id,
      type: "GALLERY_PICK_REQUEST",
      payload,
    }),
    {
      timeoutMs: 300000,
    },
  );
}

export function requestNativeImageUpload<T = unknown>(
  payload: ImageUploadRequestPayload,
) {
  return sendRequestToApp<T>(
    (id) => ({
      id,
      type: "IMAGE_UPLOAD_REQUEST",
      payload,
    }),
    { timeoutMs: 15 * 60 * 1000, cancelNativeRequest: true },
  );
}

export function openNativeInAppBrowser(url: string) {
  return sendRequestToApp<InAppBrowserOpenResponsePayload>((id) => ({
    id,
    type: "IN_APP_BROWSER_OPEN_REQUEST",
    payload: {
      url,
    },
  }));
}

export function requestNativeHealthPermissionStatus() {
  return sendRequestToApp<HealthPermissionResponsePayload>((id) => ({
    id,
    type: "HEALTH_PERMISSION_STATUS_REQUEST",
  }));
}

export function requestNativeHealthReadPermission() {
  return sendRequestToApp<HealthPermissionResponsePayload>((id) => ({
    id,
    type: "HEALTH_PERMISSION_REQUEST",
  }));
}

export function readNativeStepCountRecords(payload: HealthStepsReadRequestPayload) {
  return sendRequestToApp<HealthStepCountResponsePayload>(
    (id) => ({
      id,
      type: "HEALTH_STEPS_READ_REQUEST",
      payload,
    }),
    { timeoutMs: 15000 },
  );
}
