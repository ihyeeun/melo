import { PATH } from "@/router/path";

export const APP_SCHEME = "melo";
export const ANDROID_PACKAGE_NAME = "com.melo.frontend";
export const SETTINGS_FEEDBACK_PATH = "/settings/feedback";

const DEFAULT_ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
const APP_OPEN_FALLBACK_DELAY_MS = 1400;
const APP_OPEN_FALLBACK_PARAM = "fallback";

export function isIos() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

export function isAndroid() {
  return /Android/.test(window.navigator.userAgent);
}

export function getInstallUrl(): string | null {
  const iosStoreUrl = import.meta.env.VITE_IOS_APP_STORE_URL;
  const androidStoreUrl = import.meta.env.VITE_ANDROID_PLAY_STORE_URL || DEFAULT_ANDROID_STORE_URL;
  const commonDownloadUrl = import.meta.env.VITE_APP_DOWNLOAD_URL;

  if (isIos()) return iosStoreUrl || commonDownloadUrl || null;
  if (isAndroid()) return androidStoreUrl || commonDownloadUrl || window.location.origin;

  return commonDownloadUrl || iosStoreUrl || androidStoreUrl || null;
}

export function buildUniversalLink(path: string) {
  return new URL(path, window.location.origin).toString();
}

export function buildInstallGuideUrl() {
  const url = new URL(PATH.APP_OPEN_SETTINGS_FEEDBACK, window.location.href);
  url.searchParams.set(APP_OPEN_FALLBACK_PARAM, "1");

  return url.toString();
}

export function buildCustomSchemeUrl(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${APP_SCHEME}://${normalizedPath}`;
}

export function buildAndroidIntentUrl(path: string, fallbackUrl: string) {
  const normalizedPath = path.replace(/^\/+/, "");

  return [
    `intent://${normalizedPath}`,
    "#Intent",
    `scheme=${APP_SCHEME}`,
    `package=${ANDROID_PACKAGE_NAME}`,
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    "end",
  ].join(";");
}

export function buildAppOpenUrl(path: string) {
  if (isAndroid()) {
    return buildAndroidIntentUrl(path, buildInstallGuideUrl());
  }

  if (isIos()) {
    return buildCustomSchemeUrl(path);
  }

  return buildUniversalLink(path);
}

export function isAppOpenFallbackVisit() {
  return new URLSearchParams(window.location.search).has(APP_OPEN_FALLBACK_PARAM);
}

export function openAppWithFallback(path: string, onFallback?: () => void) {
  const fallbackUrl = buildInstallGuideUrl();
  const appOpenUrl = buildAppOpenUrl(path);

  const fallbackTimer = window.setTimeout(() => {
    if (!document.hidden) {
      window.history.replaceState(null, "", fallbackUrl);
      onFallback?.();
    }
  }, APP_OPEN_FALLBACK_DELAY_MS);

  const clearFallback = () => {
    if (document.hidden) {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", clearFallback);
    }
  };

  document.addEventListener("visibilitychange", clearFallback);
  window.location.assign(appOpenUrl);
}
