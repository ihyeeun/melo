import { MEAL_TYPE_SET, type MealType } from "@/shared/api/types/api.dto";
import {
  getMealDateKeyFromCurrentTime,
  getMealTypeFromCurrentTime,
} from "@/shared/utils/timeformat";

// 날짜 없이 들어온 경우 지금 기록할 날짜로 정한다(00:00~04:59는 전날)
export function getSafeDateKey(value: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return getMealDateKeyFromCurrentTime(new Date());
}

export function getMealType(value: string | null): MealType {
  if (value !== null && MEAL_TYPE_SET.has(value as MealType)) {
    return value as MealType;
  }

  // 끼니 값 없이 들어온 경우 지금 시각의 끼니로 정한다
  return getMealTypeFromCurrentTime(new Date());
}

export function getSafeMenuId(value: unknown): number | null {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
