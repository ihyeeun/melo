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

export function getMealDetailPath(dateKey: string, mealType: MealType, menuId: number) {
  return `${PATH.MEAL_DETAIL}?${buildPathQuery(dateKey, mealType, menuId)}`;
}

export function getPathWithMeal(path: string, dateKey: string, mealType: MealType) {
  return `${path}?${buildPathQuery(dateKey, mealType)}`;
}

type WorkoutPathOptions = {
  mode?: "edit";
};

function buildWorkoutPathQuery(dateKey: string, workoutId?: number, options?: WorkoutPathOptions) {
  const params = new URLSearchParams({
    date: dateKey,
  });

  if (workoutId !== undefined) {
    params.set("workoutId", String(workoutId));
  }

  if (options?.mode) {
    params.set("mode", options.mode);
  }

  return params.toString();
}

export function getWorkoutRecordPath(dateKey: string) {
  return `${PATH.WORKOUT_RECORD}?${buildWorkoutPathQuery(dateKey)}`;
}

export function getWorkoutRecordEditPath(dateKey: string) {
  return `${PATH.WORKOUT_RECORD_EDIT}?${buildWorkoutPathQuery(dateKey)}`;
}

export function getWorkoutSearchPath(dateKey: string, options?: WorkoutPathOptions) {
  return `${PATH.WORKOUT_RECORD_SEARCH}?${buildWorkoutPathQuery(dateKey, undefined, options)}`;
}

export function getWorkoutDetailSheetPath(
  dateKey: string,
  workoutId: number,
  options?: WorkoutPathOptions,
) {
  return `${PATH.WORKOUT_DETAIL_SHEET}?${buildWorkoutPathQuery(dateKey, workoutId, options)}`;
}

export function getWorkoutUpsertPath(
  dateKey: string,
  workoutId: number,
  options?: WorkoutPathOptions,
) {
  return `${PATH.WORKOUT_UPSERT}?${buildWorkoutPathQuery(dateKey, workoutId, options)}`;
}
