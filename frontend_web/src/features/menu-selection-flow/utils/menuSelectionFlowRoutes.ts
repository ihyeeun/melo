import { PATH } from "@/router/path";

export const MENU_SELECTION_FLOW_ID_QUERY_PARAM = "menuSelectionFlowId";

const MENU_SELECTION_FLOW_NAVIGATION_PATHNAMES = new Set<string>([
  PATH.BRAND_SEARCH,
  PATH.MEAL_RECORD_ADD_SEARCH,
  PATH.MEAL_DETAIL,
  PATH.NUTRIENT_ADD,
  PATH.NUTRIENT_ADD_REGISTER,
  PATH.NUTRIENT_ADD_MODIFY,
  PATH.NUTRIENT_CAMERA,
]);

type MenuSelectionFlowPathParams = {
  menuSelectionFlowId: string;
  menuId?: number;
  extraSearchParams?: Record<string, string | number | undefined | null>;
};

type DraftEditingMenuSelectionNavigationPathParams = {
  currentPath: string;
  draftPagePath: string;
};

function createMenuSelectionFlowSearchParams({
  extraSearchParams,
  menuId,
  menuSelectionFlowId,
}: MenuSelectionFlowPathParams) {
  const searchParams = new URLSearchParams({
    [MENU_SELECTION_FLOW_ID_QUERY_PARAM]: menuSelectionFlowId,
  });

  if (typeof menuId === "number" && Number.isInteger(menuId) && menuId > 0) {
    searchParams.set("menuId", String(menuId));
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

export function getMenuSelectionFlowIdFromSearchParams(searchParams: URLSearchParams) {
  const menuSelectionFlowId = searchParams.get(MENU_SELECTION_FLOW_ID_QUERY_PARAM)?.trim();

  return menuSelectionFlowId && menuSelectionFlowId.length > 0 ? menuSelectionFlowId : null;
}

export function getMenuSelectionFlowSearchPath(
  menuSelectionFlowId: string,
) {
  const searchParams = createMenuSelectionFlowSearchParams({
    menuSelectionFlowId,
  });

  return `${PATH.MEAL_RECORD_ADD_SEARCH}?${searchParams.toString()}`;
}

export function getMenuSelectionFlowMenuDetailPath({
  menuId,
  menuSelectionFlowId,
}: {
  menuSelectionFlowId: string;
  menuId: number;
}) {
  const searchParams = createMenuSelectionFlowSearchParams({
    menuSelectionFlowId,
    menuId,
  });

  return `${PATH.MEAL_DETAIL}?${searchParams.toString()}`;
}

export function getMenuSelectionFlowPath({
  extraSearchParams,
  menuId,
  menuSelectionFlowId,
  path,
}: MenuSelectionFlowPathParams & { path: string }) {
  const searchParams = createMenuSelectionFlowSearchParams({
    menuSelectionFlowId,
    menuId,
    extraSearchParams,
  });

  return `${path}?${searchParams.toString()}`;
}

export function isMenuSelectionFlowNavigationPathname(pathname: string) {
  return MENU_SELECTION_FLOW_NAVIGATION_PATHNAMES.has(pathname);
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

  if (url.searchParams.has(MENU_SELECTION_FLOW_ID_QUERY_PARAM)) {
    return isMenuSelectionFlowNavigationPathname(url.pathname);
  }

  return false;
}
