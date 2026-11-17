import { subDays } from "date-fns";

import type { MealType } from "@/shared/api/types/api.dto";
import { formatDateKey } from "@/shared/utils/dateFormat";

export const MEAL_TYPE_OPTIONS = [
  { key: "0", label: "아침" },
  { key: "1", label: "점심" },
  { key: "2", label: "저녁" },
  { key: "3", label: "간식" },
  { key: "4", label: "야식" },
] as const;

export function mealTimeNumberToLabel(time: number): string {
  return MEAL_TYPE_OPTIONS.find((option) => option.key === String(time))?.label ?? "식사";
}

// 서비스 정책 식사 시간 구간: 05:00~10:59 아침 · 11:00~14:59 점심 · 15:00~16:59 간식 · 17:00~20:59 저녁 · 그 외 야식
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

// 식사 기록의 하루 경계는 05:00이다. 00:00~04:59에 기록하면 전날 야식이 된다
const MEAL_DAY_START_HOUR = 5;

export function getMealDateKeyFromCurrentTime(date: Date): string {
  return formatDateKey(date.getHours() < MEAL_DAY_START_HOUR ? subDays(date, 1) : date);
}
