import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type { AnalyticsUserPropertyKey } from "@/shared/analytics/analyticsUserProperties";

export type UserProfileUpdatedField = Exclude<AnalyticsUserPropertyKey, "is_test_user">;

export function trackUserProfileUpdated(updatedFields: UserProfileUpdatedField[]) {
  if (updatedFields.length === 0) return;

  track(EVENT_NAME.USER_PROFILE_UPDATED, {
    updated_fields: updatedFields,
  });
}
