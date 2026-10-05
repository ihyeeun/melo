import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

type VitePreloadErrorEvent = Event & {
  payload?: unknown;
};

type NetworkInformation = {
  effectiveType?: string;
};

type PreloadFailureCategory =
  | "stylesheet_load"
  | "dynamic_import_load"
  | "module_import"
  | "unknown";

type PreloadFailureReason = "offline" | "http_error" | "network_or_cors" | "unknown";

const changeListeners = new Set<() => void>();

let hasPreloadError = false;
let isListenerInitialized = false;

const MAX_ERROR_MESSAGE_LENGTH = 500;
const KST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formatKoreanDateTime(timestamp: number) {
  const parts = Object.fromEntries(
    KST_DATE_TIME_FORMATTER.formatToParts(timestamp).map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} KST`;
}

function getErrorMessage(payload: unknown) {
  if (payload instanceof Error) return payload.message;
  if (typeof payload === "string") return payload;

  return "Unknown preload error";
}

function getFailureCategory(message: string): PreloadFailureCategory {
  if (/unable to preload css/i.test(message)) return "stylesheet_load";
  if (/dynamically imported module|module script|error loading dynamically imported/i.test(message)) {
    return "dynamic_import_load";
  }
  if (/import/i.test(message)) return "module_import";

  return "unknown";
}

function getResourceUrl(message: string) {
  const matchedUrl = message.match(/https?:\/\/[^\s"'<>]+|\/[^\s"'<>]+\.(?:css|m?js)(?:[?#][^\s"'<>]*)?/i)?.[0];
  if (!matchedUrl) return null;

  try {
    return new URL(matchedUrl.replace(/[),.;]+$/, ""), window.location.href);
  } catch {
    return null;
  }
}

function getResponseStatus(resourceUrl: URL | null) {
  if (!resourceUrl || typeof performance === "undefined") return null;

  const entries = performance.getEntriesByName(resourceUrl.href, "resource");
  const resourceEntry = entries.at(-1) as PerformanceResourceTiming | undefined;

  return resourceEntry?.responseStatus ?? null;
}

function getFailureReason(responseStatus: number | null): PreloadFailureReason {
  if (!navigator.onLine) return "offline";
  if (responseStatus !== null && responseStatus >= 400) return "http_error";
  if (responseStatus === 0) return "network_or_cors";

  return "unknown";
}

function getEffectiveConnectionType() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return connection?.effectiveType ?? "unknown";
}

function trackVitePreloadError(payload: unknown) {
  const fullMessage = getErrorMessage(payload);
  const resourceUrl = getResourceUrl(fullMessage);
  const responseStatus = getResponseStatus(resourceUrl);
  const occurredAt = Date.now();

  track(EVENT_NAME.VITE_PRELOAD_ERROR, {
    failure_category: getFailureCategory(fullMessage),
    failure_reason: getFailureReason(responseStatus),
    error_name: payload instanceof Error ? payload.name : typeof payload,
    error_message: fullMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    resource_url: resourceUrl ? `${resourceUrl.origin}${resourceUrl.pathname}` : null,
    response_status: responseStatus,
    page_path: window.location.pathname,
    online: navigator.onLine,
    effective_connection_type: getEffectiveConnectionType(),
    occurred_at: occurredAt,
    occurred_at_kst: formatKoreanDateTime(occurredAt),
  });
}

function emitChange() {
  changeListeners.forEach((listener) => {
    listener();
  });
}

function handleVitePreloadError(event: Event) {
  const preloadEvent = event as VitePreloadErrorEvent;

  console.error("[vite:preloadError] Failed to preload an application chunk", preloadEvent.payload);

  if (hasPreloadError) return;

  trackVitePreloadError(preloadEvent.payload);
  hasPreloadError = true;
  emitChange();

  // Do not call preventDefault(). A failed lazy import must still reject so the
  // error boundary can replace a partial or unstyled screen with its safe UI.
}

export function initVitePreloadErrorListener() {
  if (isListenerInitialized || typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", handleVitePreloadError);
  isListenerInitialized = true;
}

export function getHasVitePreloadError() {
  return hasPreloadError;
}

export function subscribeVitePreloadError(listener: () => void) {
  changeListeners.add(listener);

  return () => {
    changeListeners.delete(listener);
  };
}
