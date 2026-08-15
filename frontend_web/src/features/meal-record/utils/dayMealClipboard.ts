import type {
  DayMealSummary,
  MenuWithQuantity,
} from "@/features/home/utils/dayMealSummary";
import { MEAL_TYPE_OPTIONS, MENU_UNIT } from "@/shared/api/types/api.dto";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

export type ClipboardDayMeals = Pick<DayMealSummary, "menusByTime">;

function formatMenuForClipboard(menu: MenuWithQuantity) {
  const amountUnit = menu.unit === MENU_UNIT.MILLILITER ? "ml" : "g";
  const amount = formatNumberWithMaxOneDecimal(menu.quantity);
  const calories = formatNumberWithMaxOneDecimal(menu.calories);

  return `${menu.name} ${amount}${amountUnit} ${calories}kcal`;
}

export function buildDayMealClipboardText(dayMeals: ClipboardDayMeals) {
  return MEAL_TYPE_OPTIONS.flatMap(({ key, label }) => {
    const menus = dayMeals.menusByTime[key];

    if (menus.length > 0) {
      return `${label}: ${menus.map(formatMenuForClipboard).join(", ")}`;
    }

    return [];
  }).join("\n");
}
