import { getMealTypeFromCurrentTime } from "@/features/chat/utils/chatMeal";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

export function getCurrentDateTime() {
  const dateKey = getTodayFormatDateKey();
  const mealTime = getMealTypeFromCurrentTime(new Date());

  return { dateKey, mealTime };
}
