import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

export type RecommendMenuAnalyticsItem = {
  menu_id: number;
  menu_name: string;
};

export type MenuSaveAnalyticsItem = {
  menu_id: number;
  menu_name?: string;
  menu_weight?: number;
};

function getMenuAnalyticsProperties(menu: MenuSaveAnalyticsItem) {
  return {
    menu_id: menu.menu_id,
    ...(menu.menu_name ? { menu_name: menu.menu_name } : {}),
    ...(typeof menu.menu_weight === "number" && Number.isFinite(menu.menu_weight)
      ? { menu_weight: menu.menu_weight }
      : {}),
  };
}

function trackMenuArrayEvent(
  eventName:
    | typeof EVENT_NAME.CHAT_TEXT_MENU_SAVE
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

export function trackChatTextMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackMenuArrayEvent(EVENT_NAME.CHAT_TEXT_MENU_SAVE, menus);
}

export function trackDiaryMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackMenuArrayEvent(EVENT_NAME.DIARY_MENU_SAVE, menus);
}

export function trackRecommendMenuCancel(menus: RecommendMenuAnalyticsItem[]) {
  trackMenuArrayEvent(EVENT_NAME.RECOMMEND_MENU_CANCEL, menus);
}
