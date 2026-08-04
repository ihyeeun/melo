import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type NativeHapticType =
  | "tap"
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

const HAPTIC_TYPES = new Set<NativeHapticType>([
  "tap",
  "selection",
  "light",
  "medium",
  "heavy",
  "success",
  "warning",
  "error",
]);
const MIN_HAPTIC_INTERVAL_MS = 40;
const ANDROID_TAP_HAPTIC = Haptics.AndroidHaptics.Segment_Frequent_Tick;

let lastHapticAt = 0;

export function isNativeHapticType(value: unknown): value is NativeHapticType {
  return typeof value === "string" && HAPTIC_TYPES.has(value as NativeHapticType);
}

function runHaptic(type: NativeHapticType) {
  if (type === "tap") {
    if (Platform.OS === "android") {
      return Haptics.performAndroidHapticsAsync(ANDROID_TAP_HAPTIC);
    }

    return Haptics.selectionAsync();
  }

  switch (type) {
    case "light":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case "medium":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case "heavy":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    case "success":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case "warning":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case "error":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    case "selection":
    default:
      return Haptics.selectionAsync();
  }
}

export function triggerNativeHaptic(type: NativeHapticType = "tap") {
  const now = Date.now();
  if (now - lastHapticAt < MIN_HAPTIC_INTERVAL_MS) return;

  lastHapticAt = now;

  void runHaptic(type).catch((error) => {
    console.warn("[Haptics] failed to trigger haptic", error);
  });
}
