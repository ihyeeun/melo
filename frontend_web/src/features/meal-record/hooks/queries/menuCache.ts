import { type QueryClient, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { getMealDetail } from "@/features/meal-record/api/mealDetail";
import type {
  MenuListResponseDto,
  MenuResponseDto,
  MenuSimpleResponseDto,
  SearchResponseDto,
} from "@/shared/api/types/api.response.dto";

type MenuDetailOnlyFieldKey = Exclude<keyof MenuResponseDto, keyof MenuSimpleResponseDto>;

export type MenuDetailCacheResponseDto = MenuSimpleResponseDto & {
  [K in MenuDetailOnlyFieldKey]: MenuResponseDto[K] | null;
};

export type SearchMenuIdListResponseDto = Omit<SearchResponseDto, "menu_list"> & {
  menu_ids: MenuSimpleResponseDto["id"][];
};

export type MenuListIdResponseDto = Omit<MenuListResponseDto, "menu_list"> & {
  menu_ids: MenuSimpleResponseDto["id"][];
};

export const menuQueryKeys = {
  all: ["menus"] as const,
  detail: (menuId: number | null) => [...menuQueryKeys.all, "detail", menuId] as const,
  lists: () => [...menuQueryKeys.all, "list"] as const,
  search: (input: string, limit: number) =>
    [...menuQueryKeys.lists(), "search", input, limit] as const,
  frequentlyRecorded: () => [...menuQueryKeys.lists(), "frequently-recorded"] as const,
  registered: () => [...menuQueryKeys.lists(), "registered"] as const,
};

const MENU_DETAIL_ONLY_FIELD_KEYS = [
  "sodium",
  "caffeine",
  "potassium",
  "cholesterol",
  "alcohol",
] as const satisfies ReadonlyArray<Exclude<keyof MenuResponseDto, keyof MenuSimpleResponseDto>>;

const MENU_DETAIL_NULL_FIELDS = Object.fromEntries(
  MENU_DETAIL_ONLY_FIELD_KEYS.map((key) => [key, null]),
) as {
  [K in (typeof MENU_DETAIL_ONLY_FIELD_KEYS)[number]]: null;
};

type MenuDetailCachePatch = Partial<MenuDetailCacheResponseDto> &
  Pick<MenuDetailCacheResponseDto, "id">;

function isValidMenuId(menuId: unknown): menuId is number {
  return typeof menuId === "number" && Number.isInteger(menuId) && menuId > 0;
}

function toMenuDetailCacheResponseDto(
  menu: MenuSimpleResponseDto | MenuResponseDto | MenuDetailCacheResponseDto,
  previous?: MenuDetailCacheResponseDto,
): MenuDetailCacheResponseDto {
  return {
    ...MENU_DETAIL_NULL_FIELDS,
    ...previous,
    ...menu,
  };
}

function getMenuIds(menuList: MenuSimpleResponseDto[]) {
  return menuList.map((menu) => menu.id).filter(isValidMenuId);
}

export function writeMenuSimpleCache(
  queryClient: QueryClient,
  menu: MenuSimpleResponseDto,
): MenuDetailCacheResponseDto {
  const queryKey = menuQueryKeys.detail(menu.id);
  const cachedMenu = toMenuDetailCacheResponseDto(
    menu,
    queryClient.getQueryData<MenuDetailCacheResponseDto>(queryKey),
  );

  queryClient.setQueryData(queryKey, cachedMenu);

  return cachedMenu;
}

export function writeMenuDetailCache(
  queryClient: QueryClient,
  menu: MenuResponseDto,
): MenuDetailCacheResponseDto {
  const queryKey = menuQueryKeys.detail(menu.id);
  const cachedMenu = toMenuDetailCacheResponseDto(
    menu,
    queryClient.getQueryData<MenuDetailCacheResponseDto>(queryKey),
  );

  queryClient.setQueryData(queryKey, cachedMenu);

  return cachedMenu;
}

export function patchMenuDetailCache(queryClient: QueryClient, patch: MenuDetailCachePatch) {
  const queryKey = menuQueryKeys.detail(patch.id);

  queryClient.setQueryData<MenuDetailCacheResponseDto>(queryKey, (previous) => {
    if (!previous) {
      return previous;
    }

    return toMenuDetailCacheResponseDto(
      {
        ...previous,
        ...patch,
      },
      previous,
    );
  });
}

export function writeSearchMenuListCache(
  queryClient: QueryClient,
  response: SearchResponseDto,
): SearchMenuIdListResponseDto {
  response.menu_list.forEach((menu) => writeMenuSimpleCache(queryClient, menu));

  return {
    has_result: response.has_result,
    menu_ids: getMenuIds(response.menu_list),
    next_cursor: response.next_cursor,
  };
}

export function writeMenuListCache(
  queryClient: QueryClient,
  response: MenuListResponseDto,
): MenuListIdResponseDto {
  response.menu_list.forEach((menu) => writeMenuSimpleCache(queryClient, menu));

  return {
    menu_ids: getMenuIds(response.menu_list),
  };
}

export function useMenuCacheItems(menuIds: readonly number[]) {
  const normalizedMenuIds = useMemo(
    () => menuIds.filter(isValidMenuId),
    [menuIds],
  );
  const uniqueMenuIds = useMemo(
    () => [...new Set(normalizedMenuIds)],
    [normalizedMenuIds],
  );

  const queryResults = useQueries({
    queries: uniqueMenuIds.map((menuId) => ({
      queryKey: menuQueryKeys.detail(menuId),
      queryFn: async () => toMenuDetailCacheResponseDto(await getMealDetail(menuId)),
      enabled: false,
      staleTime: Infinity,
    })),
  });

  return useMemo(() => {
    const menuById = new Map<number, MenuDetailCacheResponseDto>();

    uniqueMenuIds.forEach((menuId, index) => {
      const menu = queryResults[index]?.data;

      if (menu) {
        menuById.set(menuId, menu);
      }
    });

    return normalizedMenuIds
      .map((menuId) => menuById.get(menuId))
      .filter((menu): menu is MenuDetailCacheResponseDto => Boolean(menu));
  }, [normalizedMenuIds, queryResults, uniqueMenuIds]);
}
