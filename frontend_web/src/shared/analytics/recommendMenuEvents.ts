import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

export type RecommendMenuAnalyticsItem = {
  menu_id: number;
  menu_name: string;
};

function trackRecommendMenuEvent(
  eventName: typeof EVENT_NAME.RECOMMEND_MENU_SAVE | typeof EVENT_NAME.RECOMMEND_MENU_CANCEL,
  menus: RecommendMenuAnalyticsItem[],
) {
  menus.forEach((menu) => {
    track(eventName, {
      menu_name: menu.menu_name,
      menu_id: menu.menu_id,
    });
  });
}

export function trackRecommendMenuSave(menus: RecommendMenuAnalyticsItem[]) {
  trackRecommendMenuEvent(EVENT_NAME.RECOMMEND_MENU_SAVE, menus);
}

export function trackRecommendMenuCancel(menus: RecommendMenuAnalyticsItem[]) {
  trackRecommendMenuEvent(EVENT_NAME.RECOMMEND_MENU_CANCEL, menus);
}
