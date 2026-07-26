import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import type { MealServingInputMode } from "@/shared/api/types/api.dto";

export type MenuDraftSeed = {
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
};

export type MenuSetDraftSeed = {
  set_id: number;
  set_name: string;
  menu_ids: number[];
  total_calories: number;
};

export function normalizeServingInputMode(mode: MealServingInputMode | undefined) {
  return mode === "unit" ? "unit" : "weight";
}

export function toMenuDraftSeed(menu: MenuWithQuantity): MenuDraftSeed {
  return {
    id: menu.id,
    quantity: menu.quantity,
    mode: menu.serving_input_mode,
  };
}

export function buildMenuDraftSignature({
  menus,
  menuSets = [],
  image,
  mealTime,
}: {
  menus: MenuDraftSeed[];
  menuSets?: MenuSetDraftSeed[];
  image?: string | null;
  mealTime?: string | null;
}) {
  const menuSignature = menus
    .map((menu) => [menu.id, menu.quantity, normalizeServingInputMode(menu.mode)] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([id, quantity, mode]) => `${id}:${quantity}:${mode}`)
    .join("|");
  const menuSetSignature = menuSets
    .map((menuSet) => [
      menuSet.set_id,
      menuSet.set_name,
      menuSet.total_calories,
      [...new Set(menuSet.menu_ids)].sort((a, b) => a - b).join(","),
    ])
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map((parts) => parts.join(":"))
    .join("|");

  return `${menuSignature}|sets:${menuSetSignature}|image:${image ?? ""}|mealTime:${mealTime ?? ""}`;
}
