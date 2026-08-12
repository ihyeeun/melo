import { PATH } from "@/router/path";
import type { MealServingInputMode, MealType } from "@/shared/api/types/api.dto";

export const MENU_SELECTION_TARGET = {
  MEAL_RECORD: "meal-record",
  FOLDER: "folder",
} as const;

export type MenuSelectionTarget =
  (typeof MENU_SELECTION_TARGET)[keyof typeof MENU_SELECTION_TARGET];

export type MenuSelectionInitialServing = {
  quantity: number;
  mode?: MealServingInputMode;
};

export type MenuSelectionRouteContext = {
  target?: MenuSelectionTarget | null;
  returnPath?: string | null;
  sourceMenuId?: number | null;
  initialServing?: MenuSelectionInitialServing | null;
  hideMenuDetailEditSection?: boolean | null;
};

export type MenuSelectionPathParams = MenuSelectionRouteContext & {
  dateKey?: string | null;
  mealType?: MealType | null;
  menuId?: number | null;
  extraSearchParams?: Record<string, string | number | undefined | null>;
};

type DraftEditingMenuSelectionNavigationPathParams = {
  currentPath: string;
  draftPagePath: string;
};

type BuildMenuSelectionPathContextParams = {
  dateKey: string;
  mealType: MealType;
  routeContext: MenuSelectionRouteContext;
  target: MenuSelectionTarget;
};

const MENU_SELECTION_TARGET_QUERY_PARAM = "selectionTarget";
const MENU_SELECTION_RETURN_PATH_QUERY_PARAM = "selectionReturnPath";
const MENU_SELECTION_SOURCE_MENU_ID_QUERY_PARAM = "sourceMenuId";
const MENU_SELECTION_INITIAL_QUANTITY_QUERY_PARAM = "initialMenuQuantity";
const MENU_SELECTION_INITIAL_INPUT_MODE_QUERY_PARAM = "initialMenuInputMode";
const MENU_SELECTION_HIDE_DETAIL_EDIT_QUERY_PARAM = "hideMenuDetailEdit";

const MENU_SELECTION_NAVIGATION_PATHNAMES = new Set<string>([
  PATH.BRAND_SEARCH,
  PATH.MEAL_RECORD_ADD_SEARCH,
  PATH.MEAL_DETAIL,
  PATH.NUTRIENT_ADD,
  PATH.NUTRIENT_ADD_REGISTER,
  PATH.NUTRIENT_ADD_MODIFY,
  PATH.NUTRIENT_CAMERA,
]);

function isMenuSelectionTarget(value: string | null | undefined): value is MenuSelectionTarget {
  return (
    value === MENU_SELECTION_TARGET.MEAL_RECORD || value === MENU_SELECTION_TARGET.FOLDER
  );
}

function isServingInputMode(value: string | null | undefined): value is MealServingInputMode {
  return value === "unit" || value === "weight";
}

function toPositiveNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toPositiveInteger(value: string | number | null | undefined) {
  const parsed = toPositiveNumber(value);

  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function isSafeInternalReturnPath(value: string | null | undefined): value is string {
  const trimmedValue = value?.trim();

  return Boolean(trimmedValue && trimmedValue.startsWith("/") && !trimmedValue.startsWith("//"));
}

function createMenuSelectionSearchParams({
  dateKey,
  extraSearchParams,
  hideMenuDetailEditSection,
  initialServing,
  mealType,
  menuId,
  returnPath,
  sourceMenuId,
  target,
}: MenuSelectionPathParams) {
  const searchParams = new URLSearchParams();

  if (typeof dateKey === "string" && dateKey.trim().length > 0) {
    searchParams.set("date", dateKey);
  }

  if (typeof mealType === "string" && mealType.trim().length > 0) {
    searchParams.set("mealType", mealType);
  }

  if (isMenuSelectionTarget(target)) {
    searchParams.set(MENU_SELECTION_TARGET_QUERY_PARAM, target);
  }

  if (isSafeInternalReturnPath(returnPath)) {
    searchParams.set(MENU_SELECTION_RETURN_PATH_QUERY_PARAM, returnPath);
  }

  const safeMenuId = toPositiveInteger(menuId);
  if (safeMenuId !== null) {
    searchParams.set("menuId", String(safeMenuId));
  }

  const safeSourceMenuId = toPositiveInteger(sourceMenuId);
  if (safeSourceMenuId !== null) {
    searchParams.set(MENU_SELECTION_SOURCE_MENU_ID_QUERY_PARAM, String(safeSourceMenuId));
  }

  const safeInitialQuantity = toPositiveNumber(initialServing?.quantity);
  if (safeInitialQuantity !== null) {
    searchParams.set(MENU_SELECTION_INITIAL_QUANTITY_QUERY_PARAM, String(safeInitialQuantity));
  }

  if (isServingInputMode(initialServing?.mode)) {
    searchParams.set(MENU_SELECTION_INITIAL_INPUT_MODE_QUERY_PARAM, initialServing.mode);
  }

  if (hideMenuDetailEditSection) {
    searchParams.set(MENU_SELECTION_HIDE_DETAIL_EDIT_QUERY_PARAM, "1");
  }

  Object.entries(extraSearchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const stringValue = String(value).trim();
    if (stringValue.length === 0) {
      return;
    }

    searchParams.set(key, stringValue);
  });

  return searchParams;
}

export function getMenuSelectionTargetFromSearchParams(searchParams: URLSearchParams) {
  const target = searchParams.get(MENU_SELECTION_TARGET_QUERY_PARAM)?.trim();

  return isMenuSelectionTarget(target) ? target : null;
}

export function getMenuSelectionReturnPathFromSearchParams(searchParams: URLSearchParams) {
  const returnPath = searchParams.get(MENU_SELECTION_RETURN_PATH_QUERY_PARAM)?.trim();

  return isSafeInternalReturnPath(returnPath) ? returnPath : null;
}

export function getMenuSelectionSourceMenuIdFromSearchParams(searchParams: URLSearchParams) {
  return toPositiveInteger(searchParams.get(MENU_SELECTION_SOURCE_MENU_ID_QUERY_PARAM));
}

export function getMenuSelectionInitialServingFromSearchParams(
  searchParams: URLSearchParams,
): MenuSelectionInitialServing | null {
  const quantity = toPositiveNumber(searchParams.get(MENU_SELECTION_INITIAL_QUANTITY_QUERY_PARAM));
  if (quantity === null) {
    return null;
  }

  const mode = searchParams.get(MENU_SELECTION_INITIAL_INPUT_MODE_QUERY_PARAM)?.trim();

  return {
    quantity,
    ...(isServingInputMode(mode) ? { mode } : {}),
  };
}

export function getMenuSelectionHideDetailEditFromSearchParams(searchParams: URLSearchParams) {
  return searchParams.get(MENU_SELECTION_HIDE_DETAIL_EDIT_QUERY_PARAM) === "1";
}

export function getMenuSelectionRouteContextFromSearchParams(
  searchParams: URLSearchParams,
): MenuSelectionRouteContext {
  return {
    target: getMenuSelectionTargetFromSearchParams(searchParams),
    returnPath: getMenuSelectionReturnPathFromSearchParams(searchParams),
    sourceMenuId: getMenuSelectionSourceMenuIdFromSearchParams(searchParams),
    initialServing: getMenuSelectionInitialServingFromSearchParams(searchParams),
    hideMenuDetailEditSection: getMenuSelectionHideDetailEditFromSearchParams(searchParams),
  };
}

export function buildMenuSelectionPathContext({
  dateKey,
  mealType,
  routeContext,
  target,
}: BuildMenuSelectionPathContextParams): MenuSelectionPathParams {
  return {
    ...routeContext,
    target,
    ...(target === MENU_SELECTION_TARGET.MEAL_RECORD ? { dateKey, mealType } : {}),
  };
}

export function getMenuSelectionSearchPath(params: MenuSelectionPathParams) {
  const searchParams = createMenuSelectionSearchParams(params);

  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${searchParams.toString()}`;
}

export function getMenuSelectionMenuDetailPath(params: MenuSelectionPathParams & { menuId: number }) {
  const searchParams = createMenuSelectionSearchParams(params);

  return `${PATH.MEAL_DETAIL}?${searchParams.toString()}`;
}

export function getMenuSelectionPath({
  path,
  ...params
}: MenuSelectionPathParams & { path: string }) {
  const searchParams = createMenuSelectionSearchParams(params);
  const query = searchParams.toString();

  return `${path}${query ? `?${query}` : ""}`;
}

export function isDraftEditingMenuSelectionNavigationPath({
  currentPath,
  draftPagePath,
}: DraftEditingMenuSelectionNavigationPathParams) {
  let url: URL;

  try {
    url = new URL(currentPath, window.location.origin);
  } catch {
    return false;
  }

  if (url.pathname === draftPagePath) {
    return true;
  }

  return (
    getMenuSelectionTargetFromSearchParams(url.searchParams) === MENU_SELECTION_TARGET.FOLDER &&
    MENU_SELECTION_NAVIGATION_PATHNAMES.has(url.pathname)
  );
}
