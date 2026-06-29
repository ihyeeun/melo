import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

export type RecommendMenuAnalyticsItem = {
  menu_id: number;
  menu_name: string;
};

export type MenuSaveAnalyticsItem = {
  menu_id: number;
  menu_name?: string;
};

const RECOMMEND_MENU_EVENT_LIMIT = 10;

function getMenuAnalyticsProperties(menu: MenuSaveAnalyticsItem) {
  return {
    menu_id: menu.menu_id,
    ...(menu.menu_name ? { menu_name: menu.menu_name } : {}),
  };
}

function trackRecommendMenuEvent(
  eventName:
    | typeof EVENT_NAME.RECOMMEND_MENU_SAVE
    | typeof EVENT_NAME.RECOMMEND_MENU_CANCEL
    | typeof EVENT_NAME.DIARY_MENU_SAVE,
  menus: MenuSaveAnalyticsItem[],
) {
  // Keep per-menu analytics bounded at 10 items if recommendation payloads grow.
  menus.slice(0, RECOMMEND_MENU_EVENT_LIMIT).forEach((menu) => {
    track(eventName, getMenuAnalyticsProperties(menu));
  });
}

export function trackChatMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackRecommendMenuEvent(EVENT_NAME.RECOMMEND_MENU_SAVE, menus);
}

export function trackDiaryMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackRecommendMenuEvent(EVENT_NAME.DIARY_MENU_SAVE, menus);
}

export function trackRecommendMenuCancel(menus: RecommendMenuAnalyticsItem[]) {
  trackRecommendMenuEvent(EVENT_NAME.RECOMMEND_MENU_CANCEL, menus);
}
