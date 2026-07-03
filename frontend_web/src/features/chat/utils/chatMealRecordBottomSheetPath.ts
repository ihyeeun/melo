import { PATH } from "@/router/path";
import type { MealType } from "@/shared/api/types/api.dto";

export function getChatMealRecordBottomSheetPath(dateKey: string, mealType: MealType) {
  const params = new URLSearchParams({
    date: dateKey,
    mealType,
  });

  return `${PATH.CHAT_MEAL_RECORD_SHEET}?${params.toString()}`;
}
