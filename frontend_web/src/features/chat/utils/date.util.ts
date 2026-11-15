import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";
import { getMealTypeFromCurrentTime } from "@/shared/utils/timeformat";

export function getCurrentDateTime() {
  const dateKey = getTodayFormatDateKey();
  const mealTime = getMealTypeFromCurrentTime(new Date());

  return { dateKey, mealTime };
}
