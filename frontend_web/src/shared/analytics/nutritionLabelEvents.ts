import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

type NutritionLabelAnalyticsProperties = Record<string, unknown>;

export function trackNutritionLabelScanStart(properties?: NutritionLabelAnalyticsProperties) {
  track(EVENT_NAME.LABEL_SCAN_START, properties);
}

export function trackNutritionLabelScanSuccess(properties?: NutritionLabelAnalyticsProperties) {
  track(EVENT_NAME.LABEL_SCAN_SUCCESS, properties);
}

export function trackNutritionLabelScanFail(
  reason: string,
  properties?: NutritionLabelAnalyticsProperties,
) {
  track(EVENT_NAME.LABEL_SCAN_FAIL, { ...properties, reason });
}

export function trackNutritionLabelRegisterSuccess() {
  track(EVENT_NAME.LABEL_REGISTER_SUCCESS);
}

export function trackNutritionLabelRegisterFail(reason: string) {
  track(EVENT_NAME.LABEL_REGISTER_FAIL, { reason });
}
