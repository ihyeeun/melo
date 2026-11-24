import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";

import type { AnalyticsEventName } from "@/shared/analytics/analytics.constants";
import {
  ANALYTICS_USER_PROPERTY_KEYS,
  type AnalyticsUserProperties,
  buildAnalyticsUserProperties,
} from "@/shared/analytics/analyticsUserProperties";
import { isNativeApp, requestNativeAppDeviceInfo } from "@/shared/api/bridge/nativeBridge";
import type { AppDeviceInfoPayload } from "@/shared/api/bridge/nativeBridge.types";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

type AnalyticsProperties = Record<string, unknown>;
type PendingEvent = {
  eventName: AnalyticsEventName;
  properties?: AnalyticsProperties;
};

const ANALYTICS_USER_ID_PREFIX = "melo_user_";
const USER_ROLE = "USER";

const sessionReplayTracking = sessionReplayPlugin({
  forceSessionTracking: true,
  sampleRate: 1,
});

// 세션이 끝나는 기준(기록 없는 시간). 앱을 켜 둔 채 둔 시간이 사용 시간에 들어가지 않게 짧게 둔다
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
// 앱이 다시 앞으로 오면 앱이 웹에 보내는 이벤트
const APP_FOREGROUND_EVENT_NAME = "MELO_APP_FOREGROUND";

let initialized = false;
let analyticsUnavailable = false;
let analyticsInitRequested = false;
let appDeviceInfoReady = false;
let appDeviceInfo: AppDeviceInfoPayload | null = null;
let currentUserRole: ProfileResponseDto["role"] | undefined;
let identifiedUserPropertiesKey: string | null = null;
let currentUserId: string | null = null;
let currentUserProperties: AnalyticsUserProperties = {};
const pendingEvents: PendingEvent[] = [];
const trackedOnceKeys = new Set<string>();

function getUserPropertiesKey(properties: AnalyticsUserProperties) {
  return JSON.stringify(
    ANALYTICS_USER_PROPERTY_KEYS.map((propertyKey) => [
      propertyKey,
      properties[propertyKey] ?? null,
    ]),
  );
}

export function getAnalyticsUserId(userId: number | string) {
  const stringUserId = String(userId);
  return stringUserId.startsWith(ANALYTICS_USER_ID_PREFIX)
    ? stringUserId
    : `${ANALYTICS_USER_ID_PREFIX}${stringUserId}`;
}

function getAmplitudeApiKey(userRole: ProfileResponseDto["role"]) {
  if (userRole !== USER_ROLE) {
    return import.meta.env.VITE_DEV_AMPLITUDE_API_KEY;
  }

  return import.meta.env.VITE_PROD_AMPLITUDE_API_KEY;
}

function disableAnalytics() {
  analyticsUnavailable = true;
  pendingEvents.length = 0;
}

function syncUserPropertiesWithAmplitude() {
  if (!initialized) return;

  const userPropertiesKey = getUserPropertiesKey(currentUserProperties);
  if (identifiedUserPropertiesKey === userPropertiesKey) return;

  const identify = new amplitude.Identify();
  ANALYTICS_USER_PROPERTY_KEYS.forEach((propertyKey) => {
    const value = currentUserProperties[propertyKey];

    if (value === undefined || value === null) {
      identify.unset(propertyKey);
      return;
    }

    identify.set(propertyKey, value);
  });

  amplitude.identify(identify);
  identifiedUserPropertiesKey = userPropertiesKey;
}

function syncUserProperties(properties: AnalyticsUserProperties) {
  currentUserProperties = properties;
  syncUserPropertiesWithAmplitude();
}

function sendTrack(eventName: AnalyticsEventName, properties?: AnalyticsProperties) {
  const nickname = currentUserProperties.nickname;
  const eventProperties = nickname ? { ...(properties ?? {}), nickname } : properties;

  amplitude.track(
    eventName,
    eventProperties,
    appDeviceInfo
      ? {
          app_version: appDeviceInfo.appVersion,
          os_name: appDeviceInfo.osName === "ios" ? "iOS" : "Android",
          os_version: appDeviceInfo.osVersion ?? undefined,
        }
      : undefined,
  );
}

function flushPendingEvents() {
  pendingEvents.splice(0).forEach(({ eventName, properties }) => {
    sendTrack(eventName, properties);
  });
}

// 앱이 백그라운드에서 돌아오면 새 세션으로 센다 (백그라운드에 둔 시간이 세션 길이에 들어가지 않게).
// fromBackground를 보내지 않는 옛 앱은 세션 시간 초과로만 나뉜다
function startNewSessionOnAppReturn() {
  window.addEventListener(APP_FOREGROUND_EVENT_NAME, (event) => {
    const detail = (event as CustomEvent<{ fromBackground?: boolean } | undefined>).detail;
    if (detail?.fromBackground) amplitude.setSessionId(Date.now());
  });
}

function initializeAnalyticsIfReady() {
  if (initialized || analyticsUnavailable || !analyticsInitRequested) return;
  if (currentUserRole === undefined || !appDeviceInfoReady) return;

  const apiKey = getAmplitudeApiKey(currentUserRole);
  if (!apiKey) {
    disableAnalytics();
    return;
  }

  amplitude.add(sessionReplayTracking);
  amplitude.init(apiKey, {
    autocapture: false,
    sessionTimeout: SESSION_TIMEOUT_MS,
  });

  initialized = true;
  startNewSessionOnAppReturn();

  if (currentUserId) {
    amplitude.setUserId(currentUserId);
  }

  if (Object.keys(currentUserProperties).length > 0) {
    syncUserPropertiesWithAmplitude();
  }

  flushPendingEvents();
}

export function initAnalytics() {
  if (analyticsInitRequested) return;

  analyticsInitRequested = true;

  if (!isNativeApp()) {
    appDeviceInfoReady = true;
    initializeAnalyticsIfReady();
    return;
  }

  void requestNativeAppDeviceInfo()
    .then((info) => {
      appDeviceInfo = info;
    })
    .catch(() => {
      // Older apps may not support this bridge request; keep tracking their events.
    })
    .finally(() => {
      appDeviceInfoReady = true;
      initializeAnalyticsIfReady();
    });
}

export function identifyAnalyticsUser(source: ProfileResponseDto) {
  currentUserRole = source.role;
  currentUserId = getAnalyticsUserId(source.user_id);

  if (initialized) {
    amplitude.setUserId(currentUserId);
  }

  syncUserProperties(buildAnalyticsUserProperties(source));
  initializeAnalyticsIfReady();
  // 로그아웃 뒤 다음 계정을 알기 전까지 모아 둔 이벤트를 이 계정으로 보낸다
  if (initialized) flushPendingEvents();
}

export function identifyNickname(nickname?: string | null) {
  const normalizedNickname = nickname?.trim() ?? null;
  if (!normalizedNickname) {
    clearAnalyticsUserProperties();
    return;
  }

  syncUserProperties({ ...currentUserProperties, nickname: normalizedNickname });
}

export function clearAnalyticsUserProperties() {
  syncUserProperties({});
}

export function resetAnalyticsIdentity() {
  pendingEvents.length = 0;
  trackedOnceKeys.clear();
  currentUserRole = undefined;
  currentUserId = null;
  currentUserProperties = {};
  identifiedUserPropertiesKey = null;

  if (!initialized) return;

  amplitude.reset();
}

export function track(eventName: AnalyticsEventName, properties?: AnalyticsProperties) {
  if (analyticsUnavailable) return;

  // 초기화 전이거나, 로그아웃해서 사용자를 모르는 동안은 모아 두었다가 사용자를 안 뒤 보낸다
  // (사용자 id 없이 새 기기로 잡히지 않게)
  if (!initialized || currentUserId === null) {
    pendingEvents.push({ eventName, properties });
    return;
  }

  sendTrack(eventName, properties);
}

export function trackOnce(
  key: string,
  eventName: AnalyticsEventName,
  properties?: AnalyticsProperties,
) {
  if (trackedOnceKeys.has(key)) return;

  trackedOnceKeys.add(key);
  track(eventName, properties);
}
