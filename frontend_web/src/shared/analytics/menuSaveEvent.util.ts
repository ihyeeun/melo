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

// 끼니가 서버에 저장된 순간에 한 번. menus는 그 끼니의 전체 음식, isEdit은 이미 있던 끼니를 고친 저장
export function trackMenuSave({
  source,
  menus,
  isEdit,
}: {
  source: "diet" | "chat";
  menus: MenuSaveAnalyticsItem[];
  isEdit: boolean;
}) {
  if (menus.length === 0) return;

  track(EVENT_NAME.MENU_SAVE, {
    source,
    menus: menus.map(getMenuAnalyticsProperties),
    is_edit: isEdit,
  });
}
