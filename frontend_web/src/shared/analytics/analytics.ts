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
let identifiedNickname: string | null = null;
const pendingEvents: PendingEvent[] = [];
const trackedOnceKeys = new Set<string>();

function syncNicknameUserProperty(nickname: string) {
  if (!initialized || identifiedNickname === nickname) return;

  const identify = new amplitude.Identify();
  identify.set("nickname", nickname);
  amplitude.identify(identify);
  identifiedNickname = nickname;
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
    syncNicknameUserProperty(currentNickname);
  }

  pendingEvents.splice(0).forEach(({ eventName, properties }) => {
    sendTrack(eventName, properties);
  });
}

export function identifyNickname(nickname?: string | null) {
  const normalizedNickname = nickname?.trim();
  if (!normalizedNickname) return;

  currentNickname = normalizedNickname;
  syncNicknameUserProperty(normalizedNickname);
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
