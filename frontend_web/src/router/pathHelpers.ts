import { PATH } from "@/router/path";
import type { MealType } from "@/shared/api/types/api.dto";

function buildPathQuery(dateKey: string, mealType: MealType, menuId?: number) {
  const params = new URLSearchParams({
    date: dateKey,
    mealType,
  });

  if (menuId !== undefined) {
    params.set("menuId", String(menuId));
  }

  return params.toString();
}

export function getMealRecordPath(dateKey: string, mealType: MealType) {
  return `${PATH.MEAL_RECORD}?${buildPathQuery(dateKey, mealType)}`;
}

export function getMealSearchPath(dateKey: string, mealType: MealType) {
  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${buildPathQuery(dateKey, mealType)}`;
}

export function getFolderDetailPath(dateKey: string, mealType: MealType, folderId: number) {
  const params = new URLSearchParams({
    date: dateKey,
    mealType,
    folderId: String(folderId),
  });

  return `${PATH.FOLDER_DETAIL}?${params.toString()}`;
}

export function getMenuSetRegisterSheetPath(dateKey: string, mealType: MealType) {
  return `${PATH.MENU_SET_REGISTER_SHEET}?${buildPathQuery(dateKey, mealType)}`;
}

export function getMenuSetDetailPath(dateKey: string, mealType: MealType, setId: number) {
  const params = new URLSearchParams({
    date: dateKey,
    mealType,
    setId: String(setId),
  });

  return `${PATH.MENU_SET_DETAIL}?${params.toString()}`;
}

export function getMealDetailPath(
  dateKey: string,
  mealType: MealType,
  menuId: number,
) {
  return `${PATH.MEAL_DETAIL}?${buildPathQuery(dateKey, mealType, menuId)}`;
}

export function getPathWithMeal(
  path: string,
  dateKey: string,
  mealType: MealType,
) {
  return `${path}?${buildPathQuery(dateKey, mealType)}`;
}
