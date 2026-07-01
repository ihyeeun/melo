import { getMealDetail } from "@/features/meal-record/api/mealDetail";
import {
  type MenuSaveAnalyticsItem,
  trackDiaryMenuSave,
} from "@/shared/analytics/recommendMenuEvents";

async function getMenuNamesById(menuIds: number[]) {
  const uniqueMenuIds = [...new Set(menuIds)];
  const entries = await Promise.all(
    uniqueMenuIds.map(async (menuId) => {
      try {
        const menu = await getMealDetail(menuId);
        return [menuId, menu.name] as const;
      } catch {
        return [menuId, undefined] as const;
      }
    }),
  );

  return new Map(entries);
}

export async function trackDiaryMenuSaveByMenuIds(menuIds: number[]) {
  if (menuIds.length === 0) return;

  const uniqueMenuIds = [...new Set(menuIds)];
  const menuNamesById = await getMenuNamesById(uniqueMenuIds);
  const menus: MenuSaveAnalyticsItem[] = uniqueMenuIds.map((menuId) => ({
    menu_id: menuId,
    menu_name: menuNamesById.get(menuId),
  }));

  trackDiaryMenuSave(menus);
}
