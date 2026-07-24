import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import {
  MENU_SELECTION_FLOW_TARGET,
  type MenuSelectionFlowTarget,
  useMenuSelectionFlowById,
  useMenuSelectionFlowClearPendingReplacementSourceMenuId,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  FOLDER_MENU_LIMIT_MESSAGE,
  MAX_FOLDER_MENUS,
} from "@/features/personal-menu/folder/constants/folder.constants";
import {
  useFolderDraftRemoveSelectedMenu,
  useFolderDraftSelectedMenus,
  useFolderDraftUpsertSelectedMenu,
} from "@/features/personal-menu/folder/stores/folderDraft.store";
import {
  MAX_MENU_SET_MENUS,
  MENU_SET_MENU_LIMIT_MESSAGE,
} from "@/features/personal-menu/set/constants/menuSet.constants";
import {
  type MenuSetDraftViewMenu,
  useMenuSetDraftRemoveSelectedMenu,
  useMenuSetDraftSelectedMenus,
  useMenuSetDraftUpsertSelectedMenu,
} from "@/features/personal-menu/set/stores/menuSetDraft.store";
import type { MealMenuItem, MealServingInputMode, MealType } from "@/shared/api/types/api.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import type { MealRecordTransferPreview } from "@/shared/types/mealRecordTransfer";

export type MenuSelectionFlowViewMenu = MenuSimpleResponseDto | MealMenuItem;

export type MenuSelectionFlowSelectedMenu = {
  menuId: number;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
  viewMenu?: MenuSelectionFlowViewMenu;
};

type UseMenuSelectionFlowAdapterParams = {
  fallbackMealRecordDateKey: string;
  fallbackMealRecordMealType: MealType;
  fallbackMenuSelectionFlowTarget: MenuSelectionFlowTarget;
  menuSelectionFlowId?: string | null;
};

type UpsertMenuSelectionFlowMenuParams = {
  viewMenu: MenuSelectionFlowViewMenu;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

type ReplaceMenuSelectionFlowMenuParams = UpsertMenuSelectionFlowMenuParams & {
  previousMenuId: number;
};

function toMealRecordTransferPreview(
  viewMenu: MenuSelectionFlowViewMenu,
): MealRecordTransferPreview {
  return {
    id: viewMenu.id,
    name: viewMenu.name,
    brand: viewMenu.brand,
    unit_quantity: viewMenu.unit_quantity,
    calories: viewMenu.calories,
    weight: viewMenu.weight ?? undefined,
    unit: viewMenu.unit,
    data_source: viewMenu.data_source,
  };
}

function normalizeMenuQuantity(menuQuantity: number) {
  return typeof menuQuantity === "number" && Number.isFinite(menuQuantity) && menuQuantity > 0
    ? menuQuantity
    : 1;
}

export function useMenuSelectionFlowAdapter({
  fallbackMealRecordDateKey,
  fallbackMealRecordMealType,
  fallbackMenuSelectionFlowTarget,
  menuSelectionFlowId,
}: UseMenuSelectionFlowAdapterParams) {
  const menuSelectionFlow = useMenuSelectionFlowById(menuSelectionFlowId);
  const menuSelectionFlowTarget =
    menuSelectionFlow?.menuSelectionFlowTarget ?? fallbackMenuSelectionFlowTarget;
  const relatedMealRecordDateKey =
    menuSelectionFlow?.relatedMealRecordDateKey ?? fallbackMealRecordDateKey;
  const relatedMealRecordMealType =
    menuSelectionFlow?.relatedMealRecordMealType ?? fallbackMealRecordMealType;
  const relatedMealRecordDraftKey = formatMenuDraftKey(
    relatedMealRecordDateKey,
    relatedMealRecordMealType,
  );

  const mealRecordSelectedMenus = useMenuDraftMenus(
    relatedMealRecordDateKey,
    relatedMealRecordMealType,
  );
  const upsertMealRecordSelectedMenu = useMenuDraftUpsert();
  const removeMealRecordSelectedMenu = useMenuDraftRemove();
  const upsertMealRecordMenuPreviews = useMenuDraftUpsertPreviews();

  const folderSelectedMenus = useFolderDraftSelectedMenus();
  const upsertFolderSelectedMenu = useFolderDraftUpsertSelectedMenu();
  const removeFolderSelectedMenu = useFolderDraftRemoveSelectedMenu();

  const menuSetSelectedMenus = useMenuSetDraftSelectedMenus();
  const upsertMenuSetSelectedMenu = useMenuSetDraftUpsertSelectedMenu();
  const removeMenuSetSelectedMenu = useMenuSetDraftRemoveSelectedMenu();
  const clearPendingReplacementSourceMenuId =
    useMenuSelectionFlowClearPendingReplacementSourceMenuId();

  const selectedMenus: MenuSelectionFlowSelectedMenu[] =
    menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.FOLDER
      ? folderSelectedMenus.map(({ requestMenu, viewMenu }) => ({
          menuId: requestMenu.menuId,
          menuQuantity: requestMenu.menuQuantity,
          menuInputMode: requestMenu.menuInputMode,
          viewMenu,
        }))
      : menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.MENU_SET
        ? menuSetSelectedMenus.map(({ requestMenu, viewMenu }) => ({
            menuId: requestMenu.menuId,
            menuQuantity: requestMenu.menuQuantity,
            menuInputMode: requestMenu.menuInputMode,
            viewMenu,
          }))
        : mealRecordSelectedMenus.map((menu) => ({
            menuId: menu.id,
            menuQuantity: menu.quantity,
            menuInputMode: menu.mode,
          }));
  const selectedMenuIdSet = new Set(selectedMenus.map((menu) => menu.menuId));
  const selectedCount = selectedMenus.length;
  const maxSelectableMenuCount =
    menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.FOLDER
      ? MAX_FOLDER_MENUS
      : menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.MENU_SET
        ? MAX_MENU_SET_MENUS
        : MAX_MEAL_RECORD_MENUS;
  const menuCountLimitMessage =
    menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.FOLDER
      ? FOLDER_MENU_LIMIT_MESSAGE
      : menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.MENU_SET
        ? MENU_SET_MENU_LIMIT_MESSAGE
        : MEAL_RECORD_MENU_LIMIT_MESSAGE;

  const getSelectedMenuServing = (menuId: number) => {
    const selectedMenu = selectedMenus.find((menu) => menu.menuId === menuId);
    if (!selectedMenu) {
      return null;
    }

    return {
      quantity: selectedMenu.menuQuantity,
      mode: selectedMenu.menuInputMode,
    };
  };

  const getInitialMenuServing = (menuId: number) => {
    const initialMenuServing = menuSelectionFlow?.initialMenuServingByMenuId?.[menuId];
    if (!initialMenuServing) {
      return null;
    }

    return {
      quantity: initialMenuServing.menuQuantity,
      mode: initialMenuServing.menuInputMode,
    };
  };

  const getMenuDetailServing = (menuId: number) =>
    getSelectedMenuServing(menuId) ?? getInitialMenuServing(menuId);

  const removeSelectedMenu = (menuId: number) => {
    if (menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.FOLDER) {
      removeFolderSelectedMenu(menuId);
      return;
    }

    if (menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.MENU_SET) {
      removeMenuSetSelectedMenu(menuId);
      return;
    }

    removeMealRecordSelectedMenu({
      key: relatedMealRecordDraftKey,
      id: menuId,
    });
  };

  const upsertSelectedMenu = ({
    menuInputMode,
    menuQuantity,
    viewMenu,
  }: UpsertMenuSelectionFlowMenuParams) => {
    const normalizedMenuQuantity = normalizeMenuQuantity(menuQuantity);

    if (menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.FOLDER) {
      upsertFolderSelectedMenu({
        viewMenu,
        menuQuantity: normalizedMenuQuantity,
        menuInputMode,
      });
      return;
    }

    if (menuSelectionFlowTarget === MENU_SELECTION_FLOW_TARGET.MENU_SET) {
      upsertMenuSetSelectedMenu({
        viewMenu: viewMenu as MenuSetDraftViewMenu,
        menuQuantity: normalizedMenuQuantity,
        menuInputMode,
      });
      return;
    }

    upsertMealRecordSelectedMenu({
      key: relatedMealRecordDraftKey,
      id: viewMenu.id,
      quantity: normalizedMenuQuantity,
      mode: menuInputMode,
    });
    upsertMealRecordMenuPreviews({
      key: relatedMealRecordDraftKey,
      previews: [toMealRecordTransferPreview(viewMenu)],
    });
  };

  const replaceSelectedMenu = ({
    menuInputMode,
    menuQuantity,
    previousMenuId,
    viewMenu,
  }: ReplaceMenuSelectionFlowMenuParams) => {
    if (previousMenuId !== viewMenu.id && selectedMenuIdSet.has(previousMenuId)) {
      removeSelectedMenu(previousMenuId);
    }

    upsertSelectedMenu({
      viewMenu,
      menuQuantity,
      menuInputMode,
    });

    if (menuSelectionFlowId) {
      clearPendingReplacementSourceMenuId({ menuSelectionFlowId });
    }
  };

  return {
    getInitialMenuServing,
    getMenuDetailServing,
    getSelectedMenuServing,
    maxSelectableMenuCount,
    menuCountLimitMessage,
    menuSelectionCompletionReturnPath: menuSelectionFlow?.menuSelectionCompletionReturnPath,
    menuSelectionFlow,
    menuSelectionFlowId,
    menuSelectionFlowTarget,
    pendingReplacementSourceMenuId: menuSelectionFlow?.pendingReplacementSourceMenuId,
    relatedMealRecordDateKey,
    relatedMealRecordDraftKey,
    relatedMealRecordMealType,
    removeSelectedMenu,
    replaceSelectedMenu,
    selectedCount,
    selectedMenuIdSet,
    selectedMenus,
    upsertSelectedMenu,
  };
}
