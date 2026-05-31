import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

export type RecommendMenuAnalyticsItem = {
  menu_id: number;
  menu_name: string;
};

export function trackRecommendMenuCancel(menus: RecommendMenuAnalyticsItem[]) {
  menus.forEach((menu) => {
    track(EVENT_NAME.RECOMMEND_MENU_CANCEL, {
      menu_name: menu.menu_name,
      menu_id: menu.menu_id,
    });
  });
}
