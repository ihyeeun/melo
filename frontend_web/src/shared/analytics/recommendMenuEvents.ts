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

function getMenuAnalyticsProperties(menu: MenuSaveAnalyticsItem) {
  return {
    menu_id: menu.menu_id,
    ...(menu.menu_name ? { menu_name: menu.menu_name } : {}),
  };
}

function trackMenuArrayEvent(
  eventName:
    | typeof EVENT_NAME.RECOMMEND_MENU_SAVE
    | typeof EVENT_NAME.RECOMMEND_MENU_CANCEL
    | typeof EVENT_NAME.DIARY_MENU_SAVE,
  menus: MenuSaveAnalyticsItem[],
) {
  if (menus.length === 0) return;

  track(eventName, { menus: menus.map(getMenuAnalyticsProperties) });
}

export function trackChatMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackMenuArrayEvent(EVENT_NAME.RECOMMEND_MENU_SAVE, menus);
}

export function trackDiaryMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackMenuArrayEvent(EVENT_NAME.DIARY_MENU_SAVE, menus);
}

export function trackRecommendMenuCancel(menus: RecommendMenuAnalyticsItem[]) {
  trackMenuArrayEvent(EVENT_NAME.RECOMMEND_MENU_CANCEL, menus);
}
