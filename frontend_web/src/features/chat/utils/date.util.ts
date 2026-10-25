import type { MealType } from "@/shared/api/types/api.dto";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

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

export function getCurrentDateTime() {
  const dateKey = getTodayFormatDateKey();
  const mealTime = getMealTypeFromCurrentTime(new Date());

  return { dateKey, mealTime };
}
