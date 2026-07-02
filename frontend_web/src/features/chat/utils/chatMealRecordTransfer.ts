import type { ChatMealRecordMenu } from "@/features/chat/components/ChatMealRecordBottomSheet";
import { type MealServingInputMode, type MealType } from "@/shared/api/types/api.dto";
import {
  CHAT_TO_MEAL_RECORD_SOURCE,
  type MealRecordTransferPreview,
  type MealRecordTransferState,
} from "@/shared/types/mealRecordTransfer";

type SelectedChatMealRecordMenu = {
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
};

function toTransferPreview(menu: ChatMealRecordMenu): MealRecordTransferPreview {
  return {
    id: menu.menu_id,
    name: menu.menu_name,
    brand: menu.brand,
    unit_quantity: menu.unit_quantity,
    calories: menu.calories,
    weight: menu.weight,
    unit: menu.unit,
  };
}

export function buildChatMealRecordTransferState({
  dateKey,
  mealType,
  selectedMenus,
  clearMealTypes,
  menus,
}: {
  dateKey: string;
  mealType: MealType;
  selectedMenus: SelectedChatMealRecordMenu[];
  clearMealTypes?: MealType[];
  menus: ChatMealRecordMenu[];
}): MealRecordTransferState {
  const menuById = new Map(menus.map((menu) => [menu.menu_id, menu]));
  const clearMealTypeSet = new Set(clearMealTypes?.filter((type) => type !== mealType) ?? []);

  return {
    source: CHAT_TO_MEAL_RECORD_SOURCE,
    dateKey,
    mealType,
    menus: selectedMenus.map((menu) => ({
      id: menu.id,
      quantity: menu.quantity,
      mode: menu.mode ?? "unit",
    })),
    clearMealTypes: [...clearMealTypeSet],
    previews: selectedMenus.reduce<MealRecordTransferPreview[]>((previews, menu) => {
      const matchedMenu = menuById.get(menu.id);

      if (matchedMenu) {
        previews.push(toTransferPreview(matchedMenu));
      }

      return previews;
    }, []),
  };
}
