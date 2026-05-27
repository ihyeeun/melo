import { useSyncExternalStore } from "react";

import { syncAppFeatureGuardEnabled } from "@/shared/api/bridge/nativeBridge";

export const FREE_USER_GUARD_ENABLED = true;

export const FEATURE_GUARD = {
  CHAT: "CHAT",
  MENU_BOARD_CAMERA: "MENU_BOARD_CAMERA",
  FOOD_CAMERA: "FOOD_CAMERA",
} as const;

export type FeatureGuardTarget = (typeof FEATURE_GUARD)[keyof typeof FEATURE_GUARD];

const BLOCKED_FEATURES = new Set<FeatureGuardTarget>([
  FEATURE_GUARD.CHAT,
  FEATURE_GUARD.MENU_BOARD_CAMERA,
  FEATURE_GUARD.FOOD_CAMERA,
]);

let freeUserGuardEnabledRuntime = FREE_USER_GUARD_ENABLED;
const featureGuardChangeListeners = new Set<(enabled: boolean) => void>();

export function isFeatureBlocked(feature: FeatureGuardTarget) {
  if (!freeUserGuardEnabledRuntime) return false;
  return BLOCKED_FEATURES.has(feature);
}

export function useIsFeatureBlocked(feature: FeatureGuardTarget) {
  const isGuardEnabled = useSyncExternalStore(
    subscribeFeatureGuardChange,
    isFreeUserGuardEnabled,
    isFreeUserGuardEnabled,
  );

  return isGuardEnabled && BLOCKED_FEATURES.has(feature);
}

export function syncFeatureGuardStateToApp() {
  syncAppFeatureGuardEnabled(freeUserGuardEnabledRuntime);
}

function emitFeatureGuardChange() {
  syncFeatureGuardStateToApp();
  featureGuardChangeListeners.forEach((listener) => {
    listener(freeUserGuardEnabledRuntime);
  });
}

export function isFreeUserGuardEnabled() {
  return freeUserGuardEnabledRuntime;
}

export function setFreeUserGuardEnabled(enabled: boolean) {
  if (freeUserGuardEnabledRuntime === enabled) return freeUserGuardEnabledRuntime;

  freeUserGuardEnabledRuntime = enabled;
  emitFeatureGuardChange();
  return freeUserGuardEnabledRuntime;
}

export function toggleFreeUserGuardEnabled() {
  return setFreeUserGuardEnabled(!freeUserGuardEnabledRuntime);
}

export function subscribeFeatureGuardChange(listener: (enabled: boolean) => void) {
  featureGuardChangeListeners.add(listener);
  return () => {
    featureGuardChangeListeners.delete(listener);
  };
}
