import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftSelectedCount,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import {
  MENU_SELECTION_TARGET,
  type MenuSelectionInitialServing,
  type MenuSelectionTarget,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
import {
  FOLDER_MENU_LIMIT_MESSAGE,
  MAX_FOLDER_MENUS,
} from "@/features/personal-menu/folder/constants/folder.constants";
import {
  useFolderDraftRemoveSelectedMenu,
  useFolderDraftSelectedMenus,
  useFolderDraftUpsertSelectedMenu,
} from "@/features/personal-menu/folder/stores/folderDraft.store";
import type { MealMenuItem, MealServingInputMode, MealType } from "@/shared/api/types/api.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import type { MealRecordTransferPreview } from "@/shared/types/mealRecordTransfer";

export type MenuSelectionViewMenu = MenuSimpleResponseDto | MealMenuItem;

export type MenuSelectionSelectedMenu = {
  menuId: number;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
  viewMenu?: MenuSelectionViewMenu;
};

type UseMenuSelectionAdapterParams = {
  mealRecordDateKey: string;
  mealRecordMealType: MealType;
  initialServingByMenuId?: Record<number, MenuSelectionInitialServing | undefined>;
  sourceMenuId?: number | null;
  target?: MenuSelectionTarget | null;
};

type UpsertMenuSelectionMenuParams = {
  viewMenu: MenuSelectionViewMenu;
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

type ReplaceMenuSelectionMenuParams = UpsertMenuSelectionMenuParams & {
  previousMenuId: number;
};

function toMealRecordTransferPreview(viewMenu: MenuSelectionViewMenu): MealRecordTransferPreview {
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

export function useMenuSelectionAdapter({
  initialServingByMenuId,
  mealRecordDateKey,
  mealRecordMealType,
  sourceMenuId,
  target,
}: UseMenuSelectionAdapterParams) {
  const selectionTarget = target ?? MENU_SELECTION_TARGET.MEAL_RECORD;
  const mealRecordDraftKey = formatMenuDraftKey(mealRecordDateKey, mealRecordMealType);

  const mealRecordSelectedMenus = useMenuDraftMenus(mealRecordDateKey, mealRecordMealType);
  const mealRecordSelectedCount = useMenuDraftSelectedCount(
    mealRecordDateKey,
    mealRecordMealType,
  );
  const upsertMealRecordSelectedMenu = useMenuDraftUpsert();
  const removeMealRecordSelectedMenu = useMenuDraftRemove();
  const upsertMealRecordMenuPreviews = useMenuDraftUpsertPreviews();

  const folderSelectedMenus = useFolderDraftSelectedMenus();
  const upsertFolderSelectedMenu = useFolderDraftUpsertSelectedMenu();
  const removeFolderSelectedMenu = useFolderDraftRemoveSelectedMenu();

  const selectedMenus: MenuSelectionSelectedMenu[] =
    selectionTarget === MENU_SELECTION_TARGET.FOLDER
      ? folderSelectedMenus.map(({ requestMenu, viewMenu }) => ({
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
  const selectedCount =
    selectionTarget === MENU_SELECTION_TARGET.MEAL_RECORD
      ? mealRecordSelectedCount
      : selectedMenus.length;
  const maxSelectableMenuCount =
    selectionTarget === MENU_SELECTION_TARGET.FOLDER ? MAX_FOLDER_MENUS : MAX_MEAL_RECORD_MENUS;
  const menuCountLimitMessage =
    selectionTarget === MENU_SELECTION_TARGET.FOLDER
      ? FOLDER_MENU_LIMIT_MESSAGE
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
    const initialServing = initialServingByMenuId?.[menuId];
    if (!initialServing) {
      return null;
    }

    return {
      quantity: initialServing.quantity,
      mode: initialServing.mode,
    };
  };

  const getMenuDetailServing = (menuId: number) =>
    getSelectedMenuServing(menuId) ?? getInitialMenuServing(menuId);

  const removeSelectedMenu = (menuId: number) => {
    if (selectionTarget === MENU_SELECTION_TARGET.FOLDER) {
      removeFolderSelectedMenu(menuId);
      return;
    }

    removeMealRecordSelectedMenu({
      key: mealRecordDraftKey,
      id: menuId,
    });
  };

  const upsertSelectedMenu = ({
    menuInputMode,
    menuQuantity,
    viewMenu,
  }: UpsertMenuSelectionMenuParams) => {
    const normalizedMenuQuantity = normalizeMenuQuantity(menuQuantity);

    if (selectionTarget === MENU_SELECTION_TARGET.FOLDER) {
      upsertFolderSelectedMenu({
        viewMenu,
        menuQuantity: normalizedMenuQuantity,
        menuInputMode,
      });
      return;
    }

    upsertMealRecordSelectedMenu({
      key: mealRecordDraftKey,
      id: viewMenu.id,
      quantity: normalizedMenuQuantity,
      mode: menuInputMode,
    });
    upsertMealRecordMenuPreviews({
      key: mealRecordDraftKey,
      previews: [toMealRecordTransferPreview(viewMenu)],
    });
  };

  const replaceSelectedMenu = ({
    menuInputMode,
    menuQuantity,
    previousMenuId,
    viewMenu,
  }: ReplaceMenuSelectionMenuParams) => {
    if (previousMenuId !== viewMenu.id && selectedMenuIdSet.has(previousMenuId)) {
      removeSelectedMenu(previousMenuId);
    }

    upsertSelectedMenu({
      viewMenu,
      menuQuantity,
      menuInputMode,
    });
  };

  return {
    getInitialMenuServing,
    getMenuDetailServing,
    getSelectedMenuServing,
    maxSelectableMenuCount,
    menuCountLimitMessage,
    mealRecordDraftKey,
    removeSelectedMenu,
    replaceSelectedMenu,
    selectedCount,
    selectedMenuIdSet,
    selectedMenus,
    selectionTarget,
    sourceMenuId,
    upsertSelectedMenu,
  };
}
