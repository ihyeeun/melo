import { DEFAULT_MEAL_TYPE, MEAL_TYPE_SET, type MealType } from "@/shared/api/types/api.dto";

export function getMealTypeFromChatMealTime(value: number): MealType {
  const asMealType = String(value);
  if (MEAL_TYPE_SET.has(asMealType as MealType)) {
    return asMealType as MealType;
  }

  return DEFAULT_MEAL_TYPE;
}

export function getMealTypeFromCurrentTime(date: Date): MealType {
  const hour = date.getHours();

  if (hour >= 5 && hour <= 10) {
    return "0";
  }

  if (hour >= 11 && hour <= 14) {
    return "1";
  }

  if (hour >= 15 && hour <= 16) {
    return "3";
  }

  if (hour >= 17 && hour <= 20) {
    return "2";
  }

  return "4";
}

export function formatQuantityText(quantity: number) {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
}
