import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";

import type { AnalyticsEventName } from "@/shared/analytics/analytics.constants";
import {
  ANALYTICS_USER_PROPERTY_KEYS,
  type AnalyticsUserProperties,
  buildAnalyticsUserProperties,
} from "@/shared/analytics/analyticsUserProperties";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

type AnalyticsProperties = Record<string, unknown>;
type PendingEvent = {
  eventName: AnalyticsEventName;
  properties?: AnalyticsProperties;
};

const ANALYTICS_USER_ID_PREFIX = "melo_user_";
const ADMIN_ROLE = "ADMIN";

const sessionReplayTracking = sessionReplayPlugin({
  forceSessionTracking: true,
  sampleRate: 1,
});

let initialized = false;
let analyticsUnavailable = false;
let analyticsInitRequested = false;
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

function getAnalyticsUserId(userId: number | string) {
  const stringUserId = String(userId);
  return stringUserId.startsWith(ANALYTICS_USER_ID_PREFIX)
    ? stringUserId
    : `${ANALYTICS_USER_ID_PREFIX}${stringUserId}`;
}

function getAmplitudeApiKey(userRole: ProfileResponseDto["role"]) {
  if (userRole === ADMIN_ROLE) {
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

  amplitude.track(eventName, eventProperties);
}

function flushPendingEvents() {
  pendingEvents.splice(0).forEach(({ eventName, properties }) => {
    sendTrack(eventName, properties);
  });
}

function initializeAnalyticsIfReady() {
  if (initialized || analyticsUnavailable || !analyticsInitRequested) return;
  if (currentUserRole === undefined) return;

  const apiKey = getAmplitudeApiKey(currentUserRole);
  if (!apiKey) {
    disableAnalytics();
    return;
  }

  amplitude.add(sessionReplayTracking);
  amplitude.init(apiKey, {
    autocapture: false,
  });

  initialized = true;

  if (currentUserId) {
    amplitude.setUserId(currentUserId);
  }

  if (Object.keys(currentUserProperties).length > 0) {
    syncUserPropertiesWithAmplitude();
  }

  flushPendingEvents();
}

export function initAnalytics() {
  analyticsInitRequested = true;
  initializeAnalyticsIfReady();
}

export function identifyAnalyticsUser(source: ProfileResponseDto) {
  currentUserRole = source.role;
  currentUserId = getAnalyticsUserId(source.user_id);

  if (initialized) {
    amplitude.setUserId(currentUserId);
  }

  syncUserProperties(buildAnalyticsUserProperties(source));
  initializeAnalyticsIfReady();
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
