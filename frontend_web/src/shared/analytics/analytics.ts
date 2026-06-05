import * as amplitude from "@amplitude/analytics-browser";

import type { AnalyticsEventName } from "@/shared/analytics/analytics.constants";
import {
  ANALYTICS_USER_PROPERTY_KEYS,
  type AnalyticsUserProperties,
  buildAnalyticsUserProperties,
} from "@/shared/analytics/analyticsUserProperties";

type AnalyticsProperties = Record<string, unknown>;
type PendingEvent = {
  eventName: AnalyticsEventName;
  properties?: AnalyticsProperties;
};
type AnalyticsUserIdentitySource = Parameters<typeof buildAnalyticsUserProperties>[0] & {
  user_id: number | string;
};

const ANALYTICS_USER_ID_PREFIX = "melo_user_";

let initialized = false;
let analyticsUnavailable = false;
let currentNickname: string | null = null;
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

function syncUserProperties(properties: AnalyticsUserProperties) {
  currentUserProperties = properties;
  currentNickname = properties.nickname ?? null;

  const userPropertiesKey = getUserPropertiesKey(properties);

  if (!initialized || identifiedUserPropertiesKey === userPropertiesKey) return;

  const identify = new amplitude.Identify();
  ANALYTICS_USER_PROPERTY_KEYS.forEach((propertyKey) => {
    const value = properties[propertyKey];

    if (value === undefined || value === null) {
      identify.unset(propertyKey);
      return;
    }

    identify.set(propertyKey, value);
  });

  amplitude.identify(identify);
  identifiedUserPropertiesKey = userPropertiesKey;
}

function getAnalyticsUserId(userId: number | string) {
  const stringUserId = String(userId);
  return stringUserId.startsWith(ANALYTICS_USER_ID_PREFIX)
    ? stringUserId
    : `${ANALYTICS_USER_ID_PREFIX}${stringUserId}`;
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

  if (currentUserId) {
    amplitude.setUserId(currentUserId);
  }

  if (Object.keys(currentUserProperties).length > 0) {
    syncUserProperties(currentUserProperties);
  }

  pendingEvents.splice(0).forEach(({ eventName, properties }) => {
    sendTrack(eventName, properties);
  });
}

export function identifyAnalyticsUser(source: AnalyticsUserIdentitySource) {
  const userId = getAnalyticsUserId(source.user_id);
  currentUserId = userId;

  if (initialized) {
    amplitude.setUserId(userId);
  }

  syncUserProperties(buildAnalyticsUserProperties(source));
}

export function identifyUserProperties(source: Parameters<typeof buildAnalyticsUserProperties>[0]) {
  syncUserProperties(buildAnalyticsUserProperties(source));
}

export function identifyNickname(nickname?: string | null, isTestUser?: boolean) {
  const normalizedNickname = nickname?.trim() ?? null;
  if (!normalizedNickname) {
    clearAnalyticsUserProperties();
    return;
  }

  identifyUserProperties({
    nickname: normalizedNickname,
    ...(isTestUser !== undefined ? { is_test_user: isTestUser } : {}),
  });
}

export function clearAnalyticsUserProperties() {
  syncUserProperties({});
}

export function resetAnalyticsIdentity() {
  pendingEvents.length = 0;
  trackedOnceKeys.clear();
  currentNickname = null;
  currentUserId = null;
  currentUserProperties = {};
  identifiedUserPropertiesKey = null;

  if (!initialized) return;

  amplitude.reset();
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
