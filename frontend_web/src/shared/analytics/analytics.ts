import * as amplitude from "@amplitude/analytics-browser";

import type { AnalyticsEventName } from "@/shared/analytics/analytics.constants";

type AnalyticsProperties = Record<string, unknown>;
type PendingEvent = {
  eventName: AnalyticsEventName;
  properties?: AnalyticsProperties;
};

let initialized = false;
let analyticsUnavailable = false;
let currentNickname: string | null = null;
let currentIsTestUser: boolean | null = null;
let identifiedUserPropertiesKey: string | null = null;
const pendingEvents: PendingEvent[] = [];
const trackedOnceKeys = new Set<string>();

function syncUserProperties(nickname: string, isTestUser: boolean | null) {
  const userPropertiesKey = `${nickname}:${isTestUser ?? "unknown"}`;

  if (!initialized || identifiedUserPropertiesKey === userPropertiesKey) return;

  const identify = new amplitude.Identify();
  identify.set("nickname", nickname);
  if (isTestUser !== null) {
    identify.set("is_test_user", isTestUser);
  }
  amplitude.identify(identify);
  identifiedUserPropertiesKey = userPropertiesKey;
}

export function initAnalytics() {
  if (initialized || analyticsUnavailable) return;

  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!apiKey) {
    analyticsUnavailable = true;
    pendingEvents.length = 0;
    return;
  }

  amplitude.init(apiKey, {
    autocapture: false,
  });

  initialized = true;

  if (currentNickname) {
    syncUserProperties(currentNickname, currentIsTestUser);
  }

  pendingEvents.splice(0).forEach(({ eventName, properties }) => {
    sendTrack(eventName, properties);
  });
}

export function identifyNickname(nickname?: string | null, isTestUser?: boolean) {
  const normalizedNickname = nickname?.trim() ?? null;
  if (!normalizedNickname) {
    currentNickname = null;
    currentIsTestUser = null;
    identifiedUserPropertiesKey = null;
    if (initialized) {
      const identify = new amplitude.Identify();
      identify.unset("nickname");
      identify.unset("is_test_user");
      amplitude.identify(identify);
      identifiedUserPropertiesKey = null;
    }
    return;
  }

  currentNickname = normalizedNickname;
  currentIsTestUser = isTestUser ?? null;
  syncUserProperties(normalizedNickname, currentIsTestUser);
}

function sendTrack(eventName: AnalyticsEventName, properties?: AnalyticsProperties) {
  const eventProperties = currentNickname
    ? { ...(properties ?? {}), nickname: currentNickname }
    : properties;

  if (import.meta.env.DEV) {
    console.log("[analytics]", eventName, eventProperties);
  }

  amplitude.track(eventName, eventProperties);
}

// amplitude에는 이벤트를 보낼 수 있는 함수
export function track(eventName: AnalyticsEventName, properties?: AnalyticsProperties) {
  if (analyticsUnavailable) return;

  if (!initialized) {
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
