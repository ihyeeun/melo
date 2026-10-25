import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import type { MealServingInputMode } from "@/shared/api/types/api.dto";

export type MenuDraftSeed = {
  id: number;
  name?: string;
  quantity: number;
  mode?: MealServingInputMode;
};

export function normalizeServingInputMode(mode: MealServingInputMode | undefined) {
  return mode === "unit" ? "unit" : "weight";
}

export function toMenuDraftSeed(menu: MenuWithQuantity): MenuDraftSeed {
  return {
    id: menu.id,
    name: menu.name.trim() || undefined,
    quantity: menu.quantity,
    mode: menu.serving_input_mode,
  };
}

export function updateMenuDraftNames(
  menus: MenuDraftSeed[],
  sourceMenus: ReadonlyArray<Pick<MenuDraftSeed, "id" | "name">>,
): MenuDraftSeed[] {
  const namesById = new Map(sourceMenus.map((menu) => [menu.id, menu.name?.trim()]));
  let hasChanges = false;
  const nextMenus = menus.map((menu) => {
    const name = namesById.get(menu.id);
    if (!name || name === menu.name) return menu;

    hasChanges = true;
    return { ...menu, name };
  });

  return hasChanges ? nextMenus : menus;
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
