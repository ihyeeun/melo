import { useMemo } from "react";

import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { useMenuCacheItems } from "@/features/meal-record/hooks/queries/menuCache";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftSelectedCount,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
  useSyncMenuDraftWithDayMeals,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  MENU_SELECTION_FLOW_TARGET,
  useMenuSelectionFlowCreateFlow,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import { getMenuSelectionFlowMenuDetailPath } from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";
import { useFolderDraftSetDraft } from "@/features/personal-menu/folder/stores/folderDraft.store";
import styles from "@/features/personal-menu/folder/styles/FolderDetailPage.module.css";
import { PATH } from "@/router/path";
import { getFolderDetailPath, getMealSearchPath } from "@/router/pathHelpers";
import { type MealServingInputMode, MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import { useFolderDetailQuery } from "../hooks/queries/useFolderDetailQuery";

type FolderDetailMenu = {
  menu: MenuSimpleResponseDto;
  quantity: number;
  inputMode: MealServingInputMode;
  displayCalories: number;
};

function toPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getFallbackQuantity(menu: MenuSimpleResponseDto) {
  return toPositiveNumber(menu.weight) ?? 1;
}

function getSafeFolderQuantity(menu: MenuSimpleResponseDto, quantity: number | undefined) {
  return toPositiveNumber(quantity) ?? getFallbackQuantity(menu);
}

function getSafeFolderInputMode(inputMode: 0 | 1 | undefined): MealServingInputMode {
  return inputMode === MENU_INPUT_MODE.UNIT ? "unit" : "weight";
}

function getSafeDraftInputMode(
  inputMode: MealServingInputMode | undefined,
  fallbackInputMode: MealServingInputMode,
) {
  return inputMode === "unit" || inputMode === "weight" ? inputMode : fallbackInputMode;
}

function scaleCaloriesByQuantity(menu: MenuSimpleResponseDto, quantity: number) {
  const baseCalories = toPositiveNumber(menu.calories) ?? 0;
  const baseWeight = toPositiveNumber(menu.weight);

  if (baseWeight === null) {
    return baseCalories;
  }

  return baseCalories * (quantity / baseWeight);
}

export default function FolderDetailPage() {
  const navigate = useNavigate();
  const createMenuSelectionFlow = useMenuSelectionFlowCreateFlow();
  const [searchParams] = useSearchParams();
  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const folderId = Number(searchParams.get("folderId"));
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const {
    data: folderDetail,
    isPending: isFolderPending,
    isError: isFolderError,
    refetch: refetchFolderDetail,
  } = useFolderDetailQuery(folderId);
  const {
    data: dayMeals,
    isPending: isDayMealsPending,
    isError: isDayMealsError,
  } = useDayMealsQuery(dateKey);
  const draftMenus = useMenuDraftMenus(dateKey, mealType);
  const selectedCount = useMenuDraftSelectedCount(dateKey, mealType);
  const upsertMenu = useMenuDraftUpsert();
  const removeMenu = useMenuDraftRemove();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const setFolderDraft = useFolderDraftSetDraft();
  const folderMenuIds = useMemo(
    () => folderDetail?.menu_list.map((menu) => menu.id) ?? [],
    [folderDetail?.menu_list],
  );
  const folderMenuItems = useMenuCacheItems(folderMenuIds);

  useSyncMenuDraftWithDayMeals({
    dateKey,
    mealType,
    dayMeals,
  });

  const draftMenuById = useMemo(
    () => new Map(draftMenus.map((menu) => [menu.id, menu])),
    [draftMenus],
  );

  const serverFolderMenus = useMemo<FolderDetailMenu[]>(() => {
    if (!folderDetail) {
      return [];
    }

    return folderMenuItems.map((menu, index) => {
      const quantity = getSafeFolderQuantity(menu, folderDetail.menu_quantities[index]);

      return {
        menu,
        quantity,
        inputMode: getSafeFolderInputMode(folderDetail.menu_input_modes[index]),
        displayCalories: scaleCaloriesByQuantity(menu, quantity),
      };
    });
  }, [folderDetail, folderMenuItems]);

  const folderMenus = useMemo<FolderDetailMenu[]>(
    () =>
      serverFolderMenus.map((folderMenu) => {
        const draftMenu = draftMenuById.get(folderMenu.menu.id);
        if (!draftMenu) {
          return folderMenu;
        }

        const quantity = getSafeFolderQuantity(folderMenu.menu, draftMenu.quantity);
        const inputMode = getSafeDraftInputMode(draftMenu.mode, folderMenu.inputMode);

        return {
          ...folderMenu,
          quantity,
          inputMode,
          displayCalories: scaleCaloriesByQuantity(folderMenu.menu, quantity),
        };
      }),
    [draftMenuById, serverFolderMenus],
  );

  const selectedMenuIdSet = useMemo(() => new Set(draftMenus.map((menu) => menu.id)), [draftMenus]);

  const folderDetailPath = getFolderDetailPath(dateKey, mealType, folderId);

  const handleBack = () => {
    navigateBack({ fallbackTo: getMealSearchPath(dateKey, mealType) });
  };

  const handleEditFolder = () => {
    if (!folderDetail) {
      return;
    }

    setFolderDraft({
      folderId,
      folderName: folderDetail.folder_name,
      selectedMenus: serverFolderMenus.map((folderMenu) => ({
        requestMenu: {
          menuId: folderMenu.menu.id,
          menuQuantity: folderMenu.quantity,
          menuInputMode: folderMenu.inputMode,
        },
        viewMenu: folderMenu.menu,
      })),
    });
    navigate(PATH.CREATE_FOLDER);
  };

  const handleMenuDetailOpen = (folderMenu: FolderDetailMenu) => {
    const menuSelectionFlowId = createMenuSelectionFlow({
      menuSelectionFlowTarget: MENU_SELECTION_FLOW_TARGET.MEAL_RECORD,
      menuSelectionCompletionReturnPath: folderDetailPath,
      relatedMealRecordDateKey: dateKey,
      relatedMealRecordMealType: mealType,
      initialMenuServingByMenuId: {
        [folderMenu.menu.id]: {
          menuQuantity: folderMenu.quantity,
          menuInputMode: folderMenu.inputMode,
        },
      },
    });

    navigate(
      getMenuSelectionFlowMenuDetailPath({
        menuSelectionFlowId,
        menuId: folderMenu.menu.id,
      }),
    );
  };

  const handleToggleMenuSelection = (folderMenu: FolderDetailMenu) => {
    if (isDayMealsPending) {
      toast.warning("식사 기록 정보를 불러오는 중입니다.");
      return;
    }

    if (isDayMealsError || !dayMeals) {
      toast.warning("식사 기록을 불러오지 못했어요", "잠시 후 다시 시도해주세요.");
      return;
    }

    const menuId = folderMenu.menu.id;

    if (selectedMenuIdSet.has(menuId)) {
      removeMenu({ key: draftKey, id: menuId });
      return;
    }

    if (selectedCount + 1 > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return;
    }

    upsertMenu({
      key: draftKey,
      id: menuId,
      quantity: folderMenu.quantity,
      mode: folderMenu.inputMode,
    });

    upsertPreviews({
      key: draftKey,
      previews: [
        {
          id: folderMenu.menu.id,
          name: folderMenu.menu.name,
          brand: folderMenu.menu.brand,
          unit_quantity: folderMenu.menu.unit_quantity,
          calories: folderMenu.menu.calories,
          weight: folderMenu.menu.weight,
          unit: folderMenu.menu.unit,
          data_source: folderMenu.menu.data_source,
        },
      ],
    });
  };

  const handleApplySelectedMenus = () => {
    if (selectedCount === 0) return;

    navigateBack({ fallbackTo: getMealSearchPath(dateKey, mealType) });
  };

  const renderContent = () => {
    if (isFolderPending) {
      return (
        <section className={styles.stateContainer}>
          <LoadingIndicator />
        </section>
      );
    }

    if (isFolderError || !folderDetail) {
      return (
        <section className={styles.stateContainer}>
          <p className="typo-body2">폴더를 불러오지 못했어요</p>
          <Button
            variant="text"
            interaction="normal"
            size="small"
            color="normal"
            onClick={() => {
              void refetchFolderDetail();
            }}
          >
            다시 시도
          </Button>
        </section>
      );
    }

    if (folderMenus.length === 0) {
      return (
        <section className={styles.stateContainer}>
          <p className="typo-body2">폴더에 담긴 음식이 없어요</p>
        </section>
      );
    }

    return (
      <div className={styles.menuList}>
        {folderMenus.map((folderMenu) => {
          const isSelected = selectedMenuIdSet.has(folderMenu.menu.id);

          return (
            <MealMenuCard
              key={folderMenu.menu.id}
              name={folderMenu.menu.name}
              calories={folderMenu.displayCalories}
              unit_quantity={folderMenu.menu.unit_quantity}
              brand={folderMenu.menu.brand}
              data_source={folderMenu.menu.data_source}
              weight={folderMenu.menu.weight}
              unit={folderMenu.menu.unit}
              quantity={folderMenu.quantity}
              icon={isSelected ? "check" : "add"}
              state={isSelected ? "select" : "default"}
              onClick={() => handleMenuDetailOpen(folderMenu)}
              onIconClick={() => {
                handleToggleMenuSelection(folderMenu);
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title={folderDetail?.folder_name ?? "폴더"}
        onBack={handleBack}
        rightSlot={
          folderDetail ? (
            <Button variant="text" color="normal" onClick={handleEditFolder}>
              수정
            </Button>
          ) : null
        }
      />

      <main className={styles.main}>{renderContent()}</main>

      <footer className={styles.footer}>
        <Button
          onClick={handleApplySelectedMenus}
          variant="filled"
          interaction={selectedCount > 0 ? "normal" : "disable"}
          size="large"
          color="primary"
          fullWidth
          disabled={selectedCount === 0}
        >
          담기
        </Button>
      </footer>
    </section>
  );
}
