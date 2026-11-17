import {
  getMealDateKeyFromCurrentTime,
  getMealTypeFromCurrentTime,
} from "@/shared/utils/timeformat";

// 지금 기록할 날짜와 끼니. 00:00~04:59는 전날 야식이다
export function getCurrentDateTime() {
  const now = new Date();

  return { dateKey: getMealDateKeyFromCurrentTime(now), mealTime: getMealTypeFromCurrentTime(now) };
}
