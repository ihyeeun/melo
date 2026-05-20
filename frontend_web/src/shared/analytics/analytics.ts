import * as amplitude from "@amplitude/analytics-browser";

import type { AnalyticsEventName } from "@/shared/analytics/analytics.constants";

let initialized = false;
let currentNickname: string | null = null;
let identifiedNickname: string | null = null;

function syncNicknameUserProperty(nickname: string) {
  if (!initialized || identifiedNickname === nickname) return;

  const identify = new amplitude.Identify();
  identify.set("nickname", nickname);
  amplitude.identify(identify);
  identifiedNickname = nickname;
}

export function initAnalytics() {
  if (initialized) return;

  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!apiKey) return;

  amplitude.init(apiKey, {
    autocapture: false,
  });

  initialized = true;

  if (currentNickname) {
    syncNicknameUserProperty(currentNickname);
  }
}

export function identifyNickname(nickname?: string | null) {
  const normalizedNickname = nickname?.trim();
  if (!normalizedNickname) return;

  currentNickname = normalizedNickname;
  syncNicknameUserProperty(normalizedNickname);
}

// amplitude에는 이벤트를 보낼 수 있는 함수
export function track(eventName: AnalyticsEventName, properties?: Record<string, unknown>) {
  if (!initialized) return;

  const eventProperties = currentNickname
    ? { ...(properties ?? {}), nickname: currentNickname }
    : properties;

  if (import.meta.env.DEV) {
    console.log("[analytics]", eventName, eventProperties);
  }

  amplitude.track(eventName, eventProperties);
}
