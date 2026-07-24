import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { MAX_MENU_SET_MENUS } from "@/features/personal-menu/set/constants/menuSet.constants";
import {
  type MealMenuItem,
  type MealServingInputMode,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import type { UpsertMenuSetRequestDto } from "@/shared/api/types/api.request.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";

export type MenuSetDraftRequestMenu = {
  menuId: number;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

export type MenuSetDraftViewMenu = MenuSimpleResponseDto | MealMenuItem;

export type MenuSetDraftSelectedMenu = {
  requestMenu: MenuSetDraftRequestMenu;
  viewMenu: MenuSetDraftViewMenu;
};

type UpsertMenuSetSelectedMenuParams = {
  viewMenu: MenuSetDraftViewMenu;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

type SetMenuSetDraftParams = {
  setId?: number;
  setName: string;
  selectedMenus: MenuSetDraftSelectedMenu[];
};

type MenuSetDraftStoreState = {
  setId?: number;
  setName: string;
  selectedMenus: MenuSetDraftSelectedMenu[];
  setDraft: (params: SetMenuSetDraftParams) => void;
  setSetName: (setName: string) => void;
  upsertSelectedMenu: (params: UpsertMenuSetSelectedMenuParams) => void;
  removeSelectedMenu: (menuId: number) => void;
  clearDraft: () => void;
  buildUpsertRequest: () => UpsertMenuSetRequestDto;
};

function normalizeMenuQuantity(menuQuantity: number) {
  return typeof menuQuantity === "number" && Number.isFinite(menuQuantity) && menuQuantity > 0
    ? Math.round(menuQuantity * 10) / 10
    : 1;
}

function normalizeMenuInputMode(menuInputMode: MealServingInputMode | null | undefined) {
  if (menuInputMode === "unit") return "unit" as const;
  if (menuInputMode === "weight") return "weight" as const;

  return undefined;
}

function toMenuSetRequestInputMode(menuInputMode: MealServingInputMode | undefined) {
  return menuInputMode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT;
}

export const useMenuSetDraftStore = create<MenuSetDraftStoreState>()(
  devtools(
    (set, get) => ({
      setId: undefined,
      setName: "",
      selectedMenus: [],

      setDraft: ({ setId, setName, selectedMenus }) => {
        set({
          setId,
          setName,
          selectedMenus: selectedMenus.slice(0, MAX_MENU_SET_MENUS),
        });
      },

      setSetName: (setName) => {
        set({ setName });
      },

      upsertSelectedMenu: ({ viewMenu, menuQuantity, menuInputMode }) => {
        set((state) => {
          const safeMenuQuantity = normalizeMenuQuantity(menuQuantity);
          const normalizedMenuInputMode = normalizeMenuInputMode(menuInputMode);
          const existingIndex = state.selectedMenus.findIndex(
            (item) => item.requestMenu.menuId === viewMenu.id,
          );
          const nextSelectedMenu: MenuSetDraftSelectedMenu = {
            requestMenu: {
              menuId: viewMenu.id,
              menuQuantity: safeMenuQuantity,
              menuInputMode: normalizedMenuInputMode,
            },
            viewMenu,
          };

          if (existingIndex < 0) {
            if (state.selectedMenus.length >= MAX_MENU_SET_MENUS) {
              return {};
            }

            return {
              selectedMenus: [...state.selectedMenus, nextSelectedMenu],
            };
          }

          return {
            selectedMenus: state.selectedMenus.map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    requestMenu: {
                      ...item.requestMenu,
                      menuQuantity: safeMenuQuantity,
                      menuInputMode: normalizedMenuInputMode ?? item.requestMenu.menuInputMode,
                    },
                    viewMenu,
                  }
                : item,
            ),
          };
        });
      },

      removeSelectedMenu: (menuId) => {
        set((state) => ({
          selectedMenus: state.selectedMenus.filter((menu) => menu.requestMenu.menuId !== menuId),
        }));
      },

      clearDraft: () => {
        set({
          setId: undefined,
          setName: "",
          selectedMenus: [],
        });
      },

      buildUpsertRequest: () => {
        const { setId, setName, selectedMenus } = get();

        return {
          ...(typeof setId === "number" ? { set_id: setId } : {}),
          set_name: setName.trim(),
          menu_ids: selectedMenus.map((menu) => menu.requestMenu.menuId),
          menu_quantities: selectedMenus.map((menu) => menu.requestMenu.menuQuantity),
          menu_input_modes: selectedMenus.map((menu) =>
            toMenuSetRequestInputMode(menu.requestMenu.menuInputMode),
          ),
        };
      },
    }),
    { name: "MenuSetDraftStore" },
  ),
);

export const useMenuSetDraftSetId = () => useMenuSetDraftStore((store) => store.setId);
export const useMenuSetDraftName = () => useMenuSetDraftStore((store) => store.setName);
export const useMenuSetDraftSelectedMenus = () =>
  useMenuSetDraftStore((store) => store.selectedMenus);
export const useMenuSetDraftSelectedCount = () =>
  useMenuSetDraftStore((store) => store.selectedMenus.length);
export const useMenuSetDraftSetDraft = () => useMenuSetDraftStore((store) => store.setDraft);
export const useMenuSetDraftSetName = () => useMenuSetDraftStore((store) => store.setSetName);
export const useMenuSetDraftUpsertSelectedMenu = () =>
  useMenuSetDraftStore((store) => store.upsertSelectedMenu);
export const useMenuSetDraftRemoveSelectedMenu = () =>
  useMenuSetDraftStore((store) => store.removeSelectedMenu);
export const useMenuSetDraftClearDraft = () => useMenuSetDraftStore((store) => store.clearDraft);
export const useMenuSetDraftBuildUpsertRequest = () =>
  useMenuSetDraftStore((store) => store.buildUpsertRequest);
