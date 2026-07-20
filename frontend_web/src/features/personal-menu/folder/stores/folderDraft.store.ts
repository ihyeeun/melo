import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { MAX_FOLDER_MENUS } from "@/features/personal-menu/folder/constants/folder.constants";
import {
  type MealMenuItem,
  type MealServingInputMode,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import type { UpsertFolderRequestDto } from "@/shared/api/types/api.request.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";

export type FolderDraftRequestMenu = {
  menuId: number;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

export type FolderDraftViewMenu = MenuSimpleResponseDto | MealMenuItem;

export type FolderDraftSelectedMenu = {
  requestMenu: FolderDraftRequestMenu;
  viewMenu: FolderDraftViewMenu;
};

type UpsertFolderSelectedMenuParams = {
  viewMenu: FolderDraftViewMenu;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

type FolderDraftStoreState = {
  folderName: string;
  selectedMenus: FolderDraftSelectedMenu[];
  setFolderName: (folderName: string) => void;
  upsertSelectedMenu: (params: UpsertFolderSelectedMenuParams) => void;
  removeSelectedMenu: (menuId: number) => void;
  clearDraft: () => void;
  buildUpsertRequest: () => UpsertFolderRequestDto;
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

function toFolderRequestInputMode(menuInputMode: MealServingInputMode | undefined) {
  return menuInputMode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT;
}

export const useFolderDraftStore = create<FolderDraftStoreState>()(
  devtools(
    (set, get) => ({
      folderName: "",
      selectedMenus: [],

      setFolderName: (folderName) => {
        set({ folderName });
      },

      upsertSelectedMenu: ({ viewMenu, menuQuantity, menuInputMode }) => {
        set((state) => {
          const safeMenuQuantity = normalizeMenuQuantity(menuQuantity);
          const normalizedMenuInputMode = normalizeMenuInputMode(menuInputMode);
          const existingIndex = state.selectedMenus.findIndex(
            (item) => item.requestMenu.menuId === viewMenu.id,
          );
          const nextSelectedMenu: FolderDraftSelectedMenu = {
            requestMenu: {
              menuId: viewMenu.id,
              menuQuantity: safeMenuQuantity,
              menuInputMode: normalizedMenuInputMode,
            },
            viewMenu,
          };

          if (existingIndex < 0) {
            if (state.selectedMenus.length >= MAX_FOLDER_MENUS) {
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
          folderName: "",
          selectedMenus: [],
        });
      },

      buildUpsertRequest: () => {
        const { folderName, selectedMenus } = get();

        return {
          folder_name: folderName.trim(),
          menu_ids: selectedMenus.map((menu) => menu.requestMenu.menuId),
          menu_quantities: selectedMenus.map((menu) => menu.requestMenu.menuQuantity),
          menu_input_modes: selectedMenus.map((menu) =>
            toFolderRequestInputMode(menu.requestMenu.menuInputMode),
          ),
        };
      },
    }),
    { name: "FolderDraftStore" },
  ),
);

export const useFolderDraftName = () => useFolderDraftStore((store) => store.folderName);
export const useFolderDraftSelectedMenus = () =>
  useFolderDraftStore((store) => store.selectedMenus);
export const useFolderDraftSelectedCount = () =>
  useFolderDraftStore((store) => store.selectedMenus.length);
export const useFolderDraftSetName = () => useFolderDraftStore((store) => store.setFolderName);
export const useFolderDraftUpsertSelectedMenu = () =>
  useFolderDraftStore((store) => store.upsertSelectedMenu);
export const useFolderDraftRemoveSelectedMenu = () =>
  useFolderDraftStore((store) => store.removeSelectedMenu);
export const useFolderDraftClearDraft = () => useFolderDraftStore((store) => store.clearDraft);
export const useFolderDraftBuildUpsertRequest = () =>
  useFolderDraftStore((store) => store.buildUpsertRequest);
