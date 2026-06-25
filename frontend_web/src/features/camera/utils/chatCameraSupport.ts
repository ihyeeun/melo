import { PATH } from "@/router/path";
import { isNativeApp, requestNativeAppDeviceInfo } from "@/shared/api/bridge/nativeBridge";
import type { AppDeviceInfoPayload } from "@/shared/api/bridge/nativeBridge.types";
import type { NavigateFunction } from "@/shared/navigation/stackflowNavigation";

const CHAT_CAMERA_MIN_APP_VERSION = "1.1.0";
const CHAT_CAMERA_SUPPORT_CHECK_TIMEOUT_MS = 1500;
const CHAT_CAMERA_SUPPORT_CHECK_TIMEOUT_RESULT = "timeout" as const;

type ChatCameraSupportResult =
  | {
      isSupported: true;
      updateUrl: null;
    }
  | {
      isSupported: false;
      updateUrl: string | null;
    };

let cachedChatCameraSupportResult: ChatCameraSupportResult | null = null;
let pendingChatCameraSupportCheck: Promise<ChatCameraSupportResult> | null = null;

function parseVersionPart(part: string | undefined) {
  const matchedNumber = part?.match(/\d+/)?.[0];
  return matchedNumber ? Number(matchedNumber) : 0;
}

function compareAppVersions(currentVersion: string, minimumVersion: string) {
  const currentParts = currentVersion.split(".").map(parseVersionPart);
  const minimumParts = minimumVersion.split(".").map(parseVersionPart);
  const maxLength = Math.max(currentParts.length, minimumParts.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (currentPart > minimumPart) return 1;
    if (currentPart < minimumPart) return -1;
  }

  return 0;
}

function isChatCameraSupportedAppVersion(appVersion: string | null | undefined) {
  if (!appVersion) return false;

  return compareAppVersions(appVersion, CHAT_CAMERA_MIN_APP_VERSION) >= 0;
}

function getUserAgentOsName(): AppDeviceInfoPayload["osName"] | null {
  if (typeof window === "undefined") return null;

  const { userAgent } = window.navigator;

  if (/Android/i.test(userAgent)) return "android";
  if (/iPad|iPhone|iPod/i.test(userAgent)) return "ios";

  return null;
}

export function getChatCameraUpdateUrl(osName: AppDeviceInfoPayload["osName"] | null = null) {
  const iosStoreUrl = import.meta.env.VITE_IOS_APP_STORE_URL;
  const androidStoreUrl = import.meta.env.VITE_ANDROID_PLAY_STORE_URL;
  const commonDownloadUrl = import.meta.env.VITE_APP_DOWNLOAD_URL;
  const resolvedOsName = osName ?? getUserAgentOsName();

  if (resolvedOsName === "ios") return iosStoreUrl || commonDownloadUrl || null;
  if (resolvedOsName === "android") return androidStoreUrl || commonDownloadUrl || null;

  return commonDownloadUrl || iosStoreUrl || androidStoreUrl || null;
}

function waitChatCameraSupportCheckTimeout() {
  return new Promise<typeof CHAT_CAMERA_SUPPORT_CHECK_TIMEOUT_RESULT>((resolve) => {
    window.setTimeout(() => {
      resolve(CHAT_CAMERA_SUPPORT_CHECK_TIMEOUT_RESULT);
    }, CHAT_CAMERA_SUPPORT_CHECK_TIMEOUT_MS);
  });
}

function resolveUnsupportedResult(osName: AppDeviceInfoPayload["osName"] | null = null) {
  return {
    isSupported: false,
    updateUrl: getChatCameraUpdateUrl(osName),
  } as const;
}

export async function getChatCameraSupportResult(): Promise<ChatCameraSupportResult> {
  if (!isNativeApp()) {
    return {
      isSupported: true,
      updateUrl: null,
    };
  }

  if (cachedChatCameraSupportResult !== null) {
    return cachedChatCameraSupportResult;
  }

  pendingChatCameraSupportCheck ??= requestNativeAppDeviceInfo()
    .then((deviceInfo): ChatCameraSupportResult => {
      if (isChatCameraSupportedAppVersion(deviceInfo.appVersion)) {
        return {
          isSupported: true,
          updateUrl: null,
        };
      }

      return resolveUnsupportedResult(deviceInfo.osName);
    })
    .catch(() => resolveUnsupportedResult())
    .then((result) => {
      cachedChatCameraSupportResult = result;
      pendingChatCameraSupportCheck = null;
      return result;
    });

  const result = await Promise.race([
    pendingChatCameraSupportCheck,
    waitChatCameraSupportCheckTimeout(),
  ]);

  return result === CHAT_CAMERA_SUPPORT_CHECK_TIMEOUT_RESULT ? resolveUnsupportedResult() : result;
}

export async function navigateToChatCameraIfSupported(navigate: NavigateFunction) {
  const result = await getChatCameraSupportResult();

  if (result.isSupported) {
    navigate(PATH.CHAT_CAMERA);
    return {
      isSupported: true,
      updateUrl: null,
    } as const;
  }

  return result;
}
