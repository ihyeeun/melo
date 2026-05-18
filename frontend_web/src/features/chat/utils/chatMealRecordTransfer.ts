import type { ChatMealRecordMenu } from "@/features/chat/components/ChatMealRecordBottomSheet";
import {
  type MealMenuInputMode,
  type MealServingInputMode,
  type MealType,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import {
  CHAT_TO_MEAL_RECORD_SOURCE,
  type MealRecordTransferPreview,
  type MealRecordTransferState,
} from "@/shared/types/mealRecordTransfer";

type SelectedChatMealRecordMenu = {
  id: number;
  quantity: number;
  inputMode: MealMenuInputMode;
};

function toServingInputMode(inputMode: MealMenuInputMode): MealServingInputMode {
  return inputMode === MENU_INPUT_MODE.WEIGHT ? "weight" : "unit";
}

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
  menus,
}: {
  dateKey: string;
  mealType: MealType;
  selectedMenus: SelectedChatMealRecordMenu[];
  menus: ChatMealRecordMenu[];
}): MealRecordTransferState {
  const menuById = new Map(menus.map((menu) => [menu.menu_id, menu]));

  return {
    source: CHAT_TO_MEAL_RECORD_SOURCE,
    dateKey,
    mealType,
    menus: selectedMenus.map((menu) => ({
      id: menu.id,
      quantity: menu.quantity,
      mode: toServingInputMode(menu.inputMode),
    })),
    previews: selectedMenus.reduce<MealRecordTransferPreview[]>((previews, menu) => {
      const matchedMenu = menuById.get(menu.id);

      if (matchedMenu) {
        previews.push(toTransferPreview(matchedMenu));
      }

      return previews;
    }, []),
  };
}
