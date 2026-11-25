import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

export function trackNutritionLabelRegisterFail(reason: string) {
  track(EVENT_NAME.LABEL_REGISTER_FAIL, { reason });
}
