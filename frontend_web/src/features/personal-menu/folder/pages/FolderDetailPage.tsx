import { useMemo, useState } from "react";

import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import { MEAL_RECORD_MENU_LIMIT_FILLED_MESSAGE } from "@/features/meal-record/constants/menu.constants";
import { useMenuCacheItems } from "@/features/meal-record/hooks/queries/menuCache";
import { useSyncMenuDraftWithDayMeals } from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import { useMenuSelectionAdapter } from "@/features/menu-selection/hooks/useMenuSelectionAdapter";
import {
  getMenuSelectionMenuDetailPath,
  MENU_SELECTION_TARGET,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
import { DetailActionSelect } from "@/features/personal-menu/components/DetailActionSelect";
import { useDeleteFolderMutation } from "@/features/personal-menu/folder/hooks/mutations/folder.mutation";
import {
  useFolderDraftClearDraft,
  useFolderDraftSetDraft,
} from "@/features/personal-menu/folder/stores/folderDraft.store";
import styles from "@/features/personal-menu/folder/styles/FolderDetailPage.module.css";
import { PATH } from "@/router/path";
import { getFolderDetailPath, getMealSearchPath } from "@/router/pathHelpers";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { type MealServingInputMode, MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingIndicator, LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
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

const DELETED_MENU_MESSAGE = "삭제된 메뉴라 담을 수 없어요";

// 폴더 응답의 음식 타입에는 is_deleted가 없어서, 서버가 내려준 값을 그대로 읽는다(끼니 요약과 같은 방식)
function isDeletedMenu(folderMenu: FolderDetailMenu) {
  return (folderMenu.menu as { is_deleted?: unknown }).is_deleted === 1;
}

// screen: DIET-03-001
export default function FolderDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const folderId = Number(searchParams.get("folderId"));
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
  const {
    maxSelectableMenuCount,
    menuCountLimitMessage,
    removeSelectedMenu,
    selectedCount,
    selectedMenuIdSet,
    selectedMenus,
    upsertSelectedMenu,
  } = useMenuSelectionAdapter({
    mealRecordDateKey: dateKey,
    mealRecordMealType: mealType,
    target: MENU_SELECTION_TARGET.MEAL_RECORD,
  });
  const setFolderDraft = useFolderDraftSetDraft();
  const clearFolderDraft = useFolderDraftClearDraft();
  const { mutateAsync: deleteFolder, isPending: isDeleteFolderPending } = useDeleteFolderMutation();
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
    () => new Map(selectedMenus.map((menu) => [menu.menuId, menu])),
    [selectedMenus],
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

        const quantity = getSafeFolderQuantity(folderMenu.menu, draftMenu.menuQuantity);
        const inputMode = getSafeDraftInputMode(draftMenu.menuInputMode, folderMenu.inputMode);

        return {
          ...folderMenu,
          quantity,
          inputMode,
          displayCalories: scaleCaloriesByQuantity(folderMenu.menu, quantity),
        };
      }),
    [draftMenuById, serverFolderMenus],
  );

  // 지운 내 음식은 폴더에 '삭제됨'으로 남지만 담을 수 없다(폴더 수정에서 직접 뺀다)
  const selectableFolderMenus = serverFolderMenus.filter(
    (folderMenu) => !isDeletedMenu(folderMenu),
  );
  const areAllFolderMenusSelected =
    selectableFolderMenus.length > 0 &&
    selectableFolderMenus.every((folderMenu) => selectedMenuIdSet.has(folderMenu.menu.id));

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

  const handleDeleteFolderConfirm = async () => {
    if (!folderDetail || isDeleteFolderPending) {
      return;
    }

    try {
      await deleteFolder({ folder_id: folderId });
      clearFolderDraft();
      toast.success("삭제되었어요");
      navigateBack({ fallbackTo: getMealSearchPath(dateKey, mealType) });
    } catch (error) {
      if (isRequestAbortError(error)) throw error;
      toast.warning("폴더 삭제에 실패했어요", "잠시 후 다시 시도해주세요.");
      throw error;
    }
  };

  const handleMenuDetailOpen = (folderMenu: FolderDetailMenu) => {
    navigate(
      getMenuSelectionMenuDetailPath({
        target: MENU_SELECTION_TARGET.MEAL_RECORD,
        dateKey,
        mealType,
        returnPath: folderDetailPath,
        hideMenuDetailEditSection: true,
        initialServing: {
          quantity: folderMenu.quantity,
          mode: folderMenu.inputMode,
        },
        menuId: folderMenu.menu.id,
      }),
    );
  };

  const canUpdateMealRecordDraft = () => {
    if (isDayMealsPending) {
      toast.warning("식사 기록 정보를 불러오는 중입니다.");
      return false;
    }

    if (isDayMealsError || !dayMeals) {
      toast.warning("식사 기록을 불러오지 못했어요", "잠시 후 다시 시도해주세요.");
      return false;
    }

    return true;
  };

  const handleToggleMenuSelection = (folderMenu: FolderDetailMenu) => {
    if (!canUpdateMealRecordDraft()) {
      return;
    }

    const menuId = folderMenu.menu.id;

    if (selectedMenuIdSet.has(menuId)) {
      removeSelectedMenu(menuId);
      return;
    }

    if (isDeletedMenu(folderMenu)) {
      toast.warning(DELETED_MENU_MESSAGE);
      return;
    }

    if (selectedCount + 1 > maxSelectableMenuCount) {
      toast.warning(menuCountLimitMessage);
      return;
    }

    upsertSelectedMenu({
      viewMenu: folderMenu.menu,
      menuQuantity: folderMenu.quantity,
      menuInputMode: folderMenu.inputMode,
    });
  };

  const handleToggleAllFolderMenus = () => {
    if (!canUpdateMealRecordDraft()) {
      return;
    }

    if (areAllFolderMenusSelected) {
      serverFolderMenus.forEach((folderMenu) => {
        removeSelectedMenu(folderMenu.menu.id);
      });
      return;
    }

    // 100개를 넘으면 아직 안 담긴 폴더 음식을 순서대로 남은 자리만큼만 담고 알린다
    const unselectedFolderMenus = selectableFolderMenus.filter(
      (folderMenu) => !selectedMenuIdSet.has(folderMenu.menu.id),
    );
    const remainingCount = Math.max(0, maxSelectableMenuCount - selectedMenuIdSet.size);

    if (remainingCount === 0) {
      toast.warning(menuCountLimitMessage);
      return;
    }

    const menusToAddIdSet = new Set(
      unselectedFolderMenus.slice(0, remainingCount).map((folderMenu) => folderMenu.menu.id),
    );

    selectableFolderMenus.forEach((folderMenu) => {
      const isSelected = selectedMenuIdSet.has(folderMenu.menu.id);
      if (!isSelected && !menusToAddIdSet.has(folderMenu.menu.id)) return;

      upsertSelectedMenu({
        viewMenu: folderMenu.menu,
        menuQuantity: folderMenu.quantity,
        menuInputMode: folderMenu.inputMode,
      });
    });

    if (menusToAddIdSet.size < unselectedFolderMenus.length) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_FILLED_MESSAGE);
    }
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
        <section>
          <p className="body-l-medium">폴더를 불러오지 못했어요</p>
          <Button
            variant="text"
            size="xs"
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
        <section>
          <p className="body-l-medium">폴더에 담긴 음식이 없어요</p>
        </section>
      );
    }

    return (
      <>
        <div className={styles.menuSectionHeader}>
          <span className={`body-s-medium text-primary`}>{folderMenus.length}개</span>

          <button
            type="button"
            onClick={handleToggleAllFolderMenus}
            className={`body-s-medium marginLeft ${areAllFolderMenusSelected ? "text-highlight" : "text-tertiary"}`}
          >
            {areAllFolderMenusSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>

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
                isDeleted={isDeletedMenu(folderMenu)}
                icon={"add"}
                state={isSelected}
                onClick={() => handleMenuDetailOpen(folderMenu)}
                onIconClick={() => {
                  handleToggleMenuSelection(folderMenu);
                }}
              />
            );
          })}
        </div>
      </>
    );
  };

  return (
    <section className={`page ${styles.root}`}>
      <PageHeader
        title={folderDetail?.folder_name ?? "폴더"}
        onBack={handleBack}
        rightSlot={
          folderDetail ? (
            <DetailActionSelect
              disabled={isDeleteFolderPending}
              onEdit={handleEditFolder}
              onDelete={() => setIsDeleteConfirmOpen(true)}
            />
          ) : null
        }
        className={styles.header}
      />

      <main className={`main`}>{renderContent()}</main>

      <footer className={`footer`}>
        <Button
          onClick={handleApplySelectedMenus}
          variant="default"
          size="m"
          fullWidth
          disabled={selectedCount === 0}
        >
          담기
        </Button>
      </footer>

      {/* screen: DIET-03-001_modal-delete */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="폴더 삭제"
        description={"폴더를 삭제할까요?\n삭제하면 되돌릴 수 없어요"}
        cancelText="취소"
        confirmText="삭제"
        emphasis="cancel"
        confirmDisabled={isDeleteFolderPending}
        closeOnConfirm={false}
        onConfirm={handleDeleteFolderConfirm}
      />

      {isDeleteFolderPending ? <LoadingOverlay label="폴더를 삭제하는 중입니다." /> : null}
    </section>
  );
}
