import { PATH } from "@/router/path";
import type { MealType } from "@/shared/api/types/api.dto";

function buildPathQuery(dateKey: string, mealType: MealType, menuId?: number, keyword?: string) {
  const params = new URLSearchParams({
    date: dateKey,
    mealType,
  });

  if (menuId !== undefined) {
    params.set("menuId", String(menuId));
  }
  if (typeof keyword === "string" && keyword.trim().length > 0) {
    params.set("keyword", keyword.trim());
  }

  return params.toString();
}

export function getMealRecordPath(dateKey: string, mealType: MealType) {
  return `${PATH.MEAL_RECORD}?${buildPathQuery(dateKey, mealType)}`;
}

export function getMealSearchPath(dateKey: string, mealType: MealType, keyword?: string) {
  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${buildPathQuery(dateKey, mealType, undefined, keyword)}`;
}

export function getFolderMenuSearchPath() {
  const params = new URLSearchParams({
    mode: "folder",
  });

  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${params.toString()}`;
}

export function getFolderMenuDetailPath(menuId: number) {
  const params = new URLSearchParams({
    mode: "folder",
    menuId: String(menuId),
  });

  return `${PATH.MEAL_DETAIL}?${params.toString()}`;
}

export function getMealDetailPath(
  dateKey: string,
  mealType: MealType,
  menuId: number,
  keyword?: string,
) {
  return `${PATH.MEAL_DETAIL}?${buildPathQuery(dateKey, mealType, menuId, keyword)}`;
}

export function getPathWithMeal(
  path: string,
  dateKey: string,
  mealType: MealType,
  keyword?: string,
) {
  return `${path}?${buildPathQuery(dateKey, mealType, undefined, keyword)}`;
}
