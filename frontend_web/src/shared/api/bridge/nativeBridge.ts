import type {
  ApiRequestPayload,
  AppDeviceInfoPayload,
  AppTabName,
  AppToWebMessage,
  CameraCaptureRequestPayload,
  CameraCaptureResponsePayload,
  GalleryPickRequestPayload,
  ImageUploadRequestPayload,
  WebToAppMessage,
} from "./nativeBridge.types";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: number | null;
};

const pendingRequests = new Map<string, PendingRequest>();
const activeTabBarVisibilitySyncIds = new Set<string>();
const MESSAGE_TYPES_REQUIRING_NAV_CONTEXT = new Set<WebToAppMessage["type"]>([
  "TAB_SYNC",
  "NAVIGATION_BACK",
]);

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

      const pending = pendingRequests.get(parsed.id);

      if (!pending) return;

      if (parsed.type === "API_RESPONSE") {
        pending.resolve(parsed.payload);
      } else {
        const payload = parsed.payload as {
          message?: string;
          statusCode?: number;
          error?: string;
        };
        const bridgeError = new Error(payload.message ?? "앱 API 요청 실패");
        Object.assign(bridgeError, payload);
        pending.reject(bridgeError);
      }

      if (pending.timeoutId !== null) {
        clearTimeout(pending.timeoutId);
      }
      pendingRequests.delete(parsed.id);
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
  options?: SendRequestOptions,
) {
  return new Promise<T>((resolve, reject) => {
    const id = generateRequestId();
    const timeoutMs = options?.timeoutMs ?? 10000;

    const timeoutId =
      timeoutMs > 0
        ? window.setTimeout(() => {
            pendingRequests.delete(id);
            reject({
              message: "앱 응답 시간이 초과되었습니다.",
              statusCode: 408,
              error: "BRIDGE_TIMEOUT",
            });
          }, timeoutMs)
        : null;

    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeoutId,
    });

    const message = messageFactory(id);

    try {
      postMessageToApp(message);
    } catch (error) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      pendingRequests.delete(id);
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
    options,
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

export function requestNativeImageUpload<T = unknown>(payload: ImageUploadRequestPayload) {
  return sendRequestToApp<T>(
    (id) => ({
      id,
      type: "IMAGE_UPLOAD_REQUEST",
      payload,
    }),
    { timeoutMs: 0 },
  );
}
