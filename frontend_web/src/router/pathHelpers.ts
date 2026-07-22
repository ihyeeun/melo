import { PATH } from "@/router/path";
import type { MealType } from "@/shared/api/types/api.dto";

export type PersonalMenuEditMode = "folder" | "set";

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

export function getFolderMenuSearchPath(returnPath?: string | null) {
  const params = new URLSearchParams({
    mode: "folder",
  });

  if (returnPath) {
    params.set("returnPath", returnPath);
  }

  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${params.toString()}`;
}

export function getMenuSetMenuSearchPath(returnPath?: string | null) {
  const params = new URLSearchParams({
    mode: "set",
  });

  if (returnPath) {
    params.set("returnPath", returnPath);
  }

  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${params.toString()}`;
}

export function getFolderMenuDetailPath(menuId: number) {
  const params = new URLSearchParams({
    mode: "folder",
    menuId: String(menuId),
  });

  return `${PATH.MEAL_DETAIL}?${params.toString()}`;
}

export function getMenuSetMenuDetailPath(menuId: number) {
  const params = new URLSearchParams({
    mode: "set",
    menuId: String(menuId),
  });

  return `${PATH.MEAL_DETAIL}?${params.toString()}`;
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

export function getPathWithMealMode(
  path: string,
  dateKey: string,
  mealType: MealType,
  mode: PersonalMenuEditMode | null | undefined,
  keyword?: string,
) {
  const params = new URLSearchParams(buildPathQuery(dateKey, mealType, undefined, keyword));

  if (mode) {
    params.set("mode", mode);
  }

  return `${path}?${params.toString()}`;
}
