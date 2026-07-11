import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import type { MealServingInputMode } from "@/shared/api/types/api.dto";

export type MenuDraftSeed = {
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
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
  image,
  mealTime,
}: {
  menus: MenuDraftSeed[];
  image?: string | null;
  mealTime?: string | null;
}) {
  const menuSignature = menus
    .map((menu) => [menu.id, menu.quantity, normalizeServingInputMode(menu.mode)] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([id, quantity, mode]) => `${id}:${quantity}:${mode}`)
    .join("|");

  return `${menuSignature}|image:${image ?? ""}|mealTime:${mealTime ?? ""}`;
}
