import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

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

function trackMenuArrayEvent({
  eventName,
  menus,
  source,
  scanType,
}: {
  eventName:
    | typeof EVENT_NAME.CHAT_TEXT_MENU_SAVE
    | typeof EVENT_NAME.DIARY_MENU_SAVE
    | typeof EVENT_NAME.MENU_SAVE_BY_SCAN;
  menus: MenuSaveAnalyticsItem[];
  source?: "home_tab" | "chat_tab";
  scanType?: "photo" | "barcode";
}) {
  if (menus.length === 0) return;

  track(eventName, {
    menus: menus.map(getMenuAnalyticsProperties),
    source: source,
    scan_type: scanType,
  });
}

export function trackChatTextMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackMenuArrayEvent({ eventName: EVENT_NAME.CHAT_TEXT_MENU_SAVE, menus, source: "chat_tab" });
}

export function trackDiaryMenuSave(menus: MenuSaveAnalyticsItem[]) {
  trackMenuArrayEvent({ eventName: EVENT_NAME.DIARY_MENU_SAVE, menus, source: "home_tab" });
}

export function trackScanMenuSave({
  menus,
  scanType,
  source,
}: {
  menus: MenuSaveAnalyticsItem[];
  scanType: "photo" | "barcode";
  source: "home_tab" | "chat_tab";
}) {
  trackMenuArrayEvent({
    eventName: EVENT_NAME.MENU_SAVE_BY_SCAN,
    menus,
    scanType: scanType,
    source: source,
  });
}
