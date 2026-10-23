import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

type ScreenView = {
  activityId: string;
  screenName: string;
  path: string;
  stackDepth: number;
};

const RESTAURANT_SCREENS = new Set(["Restaurant", "RestaurantDetail"]);

let lastScreenView: { key: string; screenName: string } | null = null;

export function trackScreenView({ activityId, screenName, path, stackDepth }: ScreenView) {
  const key = `${activityId}:${path}`;
  if (lastScreenView?.key === key) return;

  const isRestaurantTabEntry =
    RESTAURANT_SCREENS.has(screenName) &&
    !RESTAURANT_SCREENS.has(lastScreenView?.screenName ?? "");

  lastScreenView = { key, screenName };

  track(EVENT_NAME.SCREEN_VIEW, {
    screen_name: screenName,
    path,
    stack_depth: stackDepth,
  });

  if (isRestaurantTabEntry) {
    track(EVENT_NAME.RESTAURANT_TAB_ENTER);
  }
}
