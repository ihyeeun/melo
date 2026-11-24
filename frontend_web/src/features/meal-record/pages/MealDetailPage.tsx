import { useActivity } from "@stackflow/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { MealMenuNutrientDetailSkeleton } from "@/features/meal-record/components/MealMenuNutrientDetailSkeleton";
import { useMealDeleteMutation } from "@/features/meal-record/hooks/mutations/useMealDetailMutation";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import {
  useMenuDraftUpsertPreviews,
  useSyncMenuDraftWithDayMeals,
} from "@/features/meal-record/stores/menuDraft.store";
import styles from "@/features/meal-record/styles/MealDetailPage.module.css";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import { toNullableNumber } from "@/features/meal-record/utils/nutrientDetail";
import { useMenuSelectionAdapter } from "@/features/menu-selection/hooks/useMenuSelectionAdapter";
import {
  buildMenuSelectionPathContext,
  getMenuSelectionPath,
  getMenuSelectionRouteContextFromSearchParams,
  getMenuSelectionSearchPath,
  MENU_SELECTION_TARGET,
  type MenuSelectionPathParams,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
import type { NutrientModifyLocationState } from "@/features/nutrient-entry/types/nutrientEntry.state";
import { folderQueryKeys } from "@/features/personal-menu/folder/hooks/queries/folder.queryKey";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { type MealMenuItem, MENU_DATA_SOURCE } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

function getMenuIsDeleted(menu: unknown) {
  const isDeleted = (menu as { is_deleted?: unknown }).is_deleted;
  return typeof isDeleted === "number" ? isDeleted : 0;
}

// screen: DIET-02-001
export default function MealDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selection, setSelection] = useState<MealMenuNutrientSelection | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const menuSelectionRouteContext = getMenuSelectionRouteContextFromSearchParams(searchParams);
  const menuSelectionTarget = menuSelectionRouteContext.target ?? MENU_SELECTION_TARGET.MEAL_RECORD;
  const hasMenuSelectionRouteContext =
    menuSelectionRouteContext.target !== null ||
    menuSelectionRouteContext.returnPath !== null ||
    menuSelectionRouteContext.sourceMenuId !== null;

  const rawMenuId = searchParams.get("menuId");
  const parsedMenuId = rawMenuId ? Number(rawMenuId) : null;
  const menuId =
    parsedMenuId !== null && Number.isInteger(parsedMenuId) && parsedMenuId > 0
      ? parsedMenuId
      : null;

  const upsertPreviews = useMenuDraftUpsertPreviews();
  const initialServingByMenuId =
    menuId !== null && menuSelectionRouteContext.initialServing
      ? { [menuId]: menuSelectionRouteContext.initialServing }
      : undefined;
  const menuSelectionAdapter = useMenuSelectionAdapter({
    mealRecordDateKey: dateKey,
    mealRecordMealType: mealType,
    initialServingByMenuId,
    sourceMenuId: menuSelectionRouteContext.sourceMenuId,
    target: menuSelectionTarget,
  });
  const isPersonalMenuEditMode =
    menuSelectionAdapter.selectionTarget === MENU_SELECTION_TARGET.FOLDER;
  const menuSelectionPathContext = buildMenuSelectionPathContext({
    dateKey,
    mealType,
    routeContext: menuSelectionRouteContext,
    target: menuSelectionAdapter.selectionTarget,
  });
  const activeMenuSelectionPathContext = hasMenuSelectionRouteContext
    ? menuSelectionPathContext
    : null;

  const { data: meal, isPending, isLoadingError } = useMealDetailQuery(menuId);
  const queryClient = useQueryClient();
  const { isActive } = useActivity();
  const hasLeftForFailureRef = useRef(false);

  const getBackFallbackPath = () => {
    if (menuSelectionRouteContext.returnPath) {
      return menuSelectionRouteContext.returnPath;
    }

    if (activeMenuSelectionPathContext) {
      return getMenuSelectionSearchPath(activeMenuSelectionPathContext);
    }

    return getMealRecordPath(dateKey, mealType);
  };

  const handleGoBack = () => {
    navigateBack({ fallbackTo: getBackFallbackPath() });
  };

  // 지운 음식은 지금 담는 중인 목록에서 빼서 [N개 담겼어요]를 줄인다.
  // 이미 저장된 식사 기록 · 폴더에서는 빼지 않고 '삭제됨'으로 남긴다
  const removeDeletedMenuFromDraft = (deletedMenuId: number) => {
    if (menuSelectionAdapter.selectionTarget !== MENU_SELECTION_TARGET.MEAL_RECORD) return;

    const savedDayMeals = queryClient.getQueryData<DayMealSummary>(
      homeQueryKeys.dayMeals.byDate(dateKey),
    );
    const isSavedInMeal = savedDayMeals?.menusByTime[mealType].some(
      (menu) => menu.id === deletedMenuId,
    );
    if (isSavedInMeal) return;

    menuSelectionAdapter.removeSelectedMenu(deletedMenuId);
  };

  const { mutate: deleteMealMutation, isPending: isDeletePending } = useMealDeleteMutation({
    onSuccess: () => {
      if (menuId !== null) removeDeletedMenuFromDraft(menuId);
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.dayMeals.all });
      void queryClient.invalidateQueries({ queryKey: folderQueryKeys.details() });
      toast.success("음식을 삭제했어요");
      handleGoBack();
    },
  });

  // 상세를 열 수 없으면(잘못된 진입 · 불러오기 실패) 안내 후 카드를 눌렀던 직전 화면으로 돌아간다.
  // 이 화면이 맨 위일 때 한 번만 돌아가야 다른 화면을 닫지 않는다
  const backFallbackPath = getBackFallbackPath();
  const failureMessage =
    menuId === null
      ? "음식 정보를 찾지 못했어요"
      : isLoadingError
        ? "음식 정보를 불러오지 못했어요"
        : null;

  useEffect(() => {
    if (!failureMessage || !isActive || hasLeftForFailureRef.current) return;

    hasLeftForFailureRef.current = true;
    toast.warning(failureMessage);
    navigateBack({ fallbackTo: backFallbackPath });
  }, [backFallbackPath, failureMessage, isActive]);

  const existingSelection = useMemo(() => {
    if (menuId === null) {
      return null;
    }

    return menuSelectionAdapter.getMenuDetailServing(menuId);
  }, [menuId, menuSelectionAdapter]);
  const isAlreadyQueued = useMemo(() => {
    if (menuId === null) {
      return false;
    }

    return menuSelectionAdapter.selectedMenuIdSet.has(menuId);
  }, [menuId, menuSelectionAdapter.selectedMenuIdSet]);
  const isFromChat =
    menuSelectionTarget === MENU_SELECTION_TARGET.MEAL_RECORD &&
    menuSelectionRouteContext.returnPath === PATH.CHAT;

  const { data: dayMeals } = useDayMealsQuery(isFromChat ? dateKey : "");

  useSyncMenuDraftWithDayMeals({
    dateKey,
    mealType,
    dayMeals,
    enabled: isFromChat,
  });

  useEffect(() => {
    // 이미 draft에 담긴 메뉴를 수정한 경우, "담기"를 다시 누르지 않아도 preview를 최신 데이터로 동기화한다.
    if (isPersonalMenuEditMode || !meal || menuId === null || !existingSelection) {
      return;
    }

    upsertPreviews({
      key: menuSelectionAdapter.mealRecordDraftKey,
      previews: [
        {
          id: meal.id,
          name: meal.name,
          brand: meal.brand,
          unit_quantity: meal.unit_quantity,
          calories: meal.calories,
          weight: meal.weight ?? undefined,
          unit: meal.unit,
          data_source: meal.data_source,
        },
      ],
    });
  }, [
    existingSelection,
    isPersonalMenuEditMode,
    meal,
    menuId,
    menuSelectionAdapter.mealRecordDraftKey,
    upsertPreviews,
  ]);

  const handleAddMenu = () => {
    if (!meal || !selection) {
      toast.warning("입력값을 다시 확인해주세요");
      return;
    }

    if (isFromChat && !dayMeals) return;

    const nextMenuId = selection.menu.id;
    const replacementSourceMenuIdCandidate = menuSelectionAdapter.sourceMenuId;
    const replacementSourceMenuId =
      typeof replacementSourceMenuIdCandidate === "number" &&
      Number.isInteger(replacementSourceMenuIdCandidate) &&
      replacementSourceMenuIdCandidate > 0
        ? replacementSourceMenuIdCandidate
        : null;

    const shouldReplaceMenu =
      replacementSourceMenuId !== null &&
      replacementSourceMenuId !== nextMenuId &&
      menuSelectionAdapter.selectedMenuIdSet.has(replacementSourceMenuId);

    const nextSelectedMenuIds = new Set(menuSelectionAdapter.selectedMenuIdSet);
    if (shouldReplaceMenu) {
      nextSelectedMenuIds.delete(replacementSourceMenuId);
    }
    nextSelectedMenuIds.add(nextMenuId);

    if (nextSelectedMenuIds.size > menuSelectionAdapter.maxSelectableMenuCount) {
      toast.warning(menuSelectionAdapter.menuCountLimitMessage);
      return;
    }

    if (shouldReplaceMenu) {
      menuSelectionAdapter.replaceSelectedMenu({
        previousMenuId: replacementSourceMenuId,
        viewMenu: selection.menu,
        menuQuantity: selection.quantity,
        menuInputMode: selection.mode,
      });
    } else {
      menuSelectionAdapter.upsertSelectedMenu({
        viewMenu: selection.menu,
        menuQuantity: selection.quantity,
        menuInputMode: selection.mode,
      });
    }

    if (isFromChat) {
      navigate(getMealRecordPath(dateKey, mealType), {
        replace: true,
      });
      return;
    }

    navigateBack({
      fallbackTo: getBackFallbackPath(),
    });
  };

  if (isPending) {
    return (
      <section className={`${styles.page} page`}>
        <PageHeader title="영양성분 상세" onBack={handleGoBack} />

        <main className="main">
          <MealMenuNutrientDetailSkeleton />
        </main>
      </section>
    );
  }

  if (!meal || menuId === null) {
    return null;
  }

  const isPersonalMenuData = meal.data_source === MENU_DATA_SOURCE.PERSONAL;
  const mealIsDeleted = getMenuIsDeleted(meal);
  const showEditSection =
    !menuSelectionRouteContext.hideMenuDetailEditSection &&
    (meal.data_source === MENU_DATA_SOURCE.PUBLIC || mealIsDeleted === 0);
  const addButtonLabel = isPersonalMenuEditMode ? "추가하기" : "담기";
  const footerButtonLabel = mealIsDeleted
    ? "삭제된 음식이라 담을 수 없어요"
    : isAlreadyQueued
      ? "수정하기"
      : addButtonLabel;

  const getNutrientModifyPath = (
    targetMenuId: number,
    targetMenuSelectionContext = activeMenuSelectionPathContext,
  ) => {
    if (targetMenuSelectionContext?.target) {
      return getMenuSelectionPath({
        path: PATH.NUTRIENT_ADD_MODIFY,
        ...targetMenuSelectionContext,
        menuId: targetMenuId,
      });
    }

    const modifyQueryParams = new URLSearchParams({
      date: dateKey,
      mealType,
      menuId: String(targetMenuId),
    });

    return `${PATH.NUTRIENT_ADD_MODIFY}?${modifyQueryParams.toString()}`;
  };

  const handleEditAndAdd = () => {
    if (isPersonalMenuData) {
      moveToNutrientModify(meal);
      return;
    }

    if (menuId === null) {
      return;
    }

    const replacementMenuSelectionContext: MenuSelectionPathParams =
      activeMenuSelectionPathContext ?? {
        target: MENU_SELECTION_TARGET.MEAL_RECORD,
        returnPath: getMealRecordPath(dateKey, mealType),
        dateKey,
        mealType,
      };

    const menuToModify = selection
      ? {
          ...selection.menu,
          carbs: toNullableNumber(meal.carbs) === null ? meal.carbs : selection.menu.carbs,
          protein: toNullableNumber(meal.protein) === null ? meal.protein : selection.menu.protein,
          fat: toNullableNumber(meal.fat) === null ? meal.fat : selection.menu.fat,
        }
      : meal;

    moveToNutrientModify(menuToModify, {
      ...replacementMenuSelectionContext,
      sourceMenuId: menuId,
    });
  };

  const moveToNutrientModify = (
    menuToModify: MealMenuItem,
    targetMenuSelectionContext = activeMenuSelectionPathContext,
  ) => {
    const state: NutrientModifyLocationState = {
      menu: menuToModify,
    };

    navigate(getNutrientModifyPath(menuToModify.id, targetMenuSelectionContext), { state });
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteMealMutation(menuId);
  };

  return (
    <section className={`${styles.page} page`}>
      <PageHeader
        title="영양성분 상세"
        onBack={handleGoBack}
        rightSlot={
          !isFromChat &&
          isPersonalMenuData &&
          mealIsDeleted === 0 && (
            <Button variant="text" size="xs" onClick={handleDelete}>
              삭제
            </Button>
          )
        }
      />

      <main className={`main`}>
        <MealMenuNutrientDetail
          menu={meal}
          initialQuantity={existingSelection?.quantity}
          initialMode={existingSelection?.mode}
          isDetailOpen={isDetailOpen}
          onToggleDetail={() => setIsDetailOpen((prev) => !prev)}
          onSelectionChange={setSelection}
          onEditAndAdd={handleEditAndAdd}
          showEditSection={showEditSection}
        />
      </main>

      {/* AI 채팅 [등록한 메뉴 보기]로 연 상세는 확인 · 수정만 한다([담기] · [삭제] 숨김) */}
      {!isFromChat && (
        <footer className={`footer`}>
          <Button
            variant="default"
            size="m"
            fullWidth
            onClick={handleAddMenu}
            disabled={!selection || mealIsDeleted !== 0}
          >
            {footerButtonLabel}
          </Button>
        </footer>
      )}

      {/* screen: DIET-02-001_modal-delete */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="영양성분 삭제"
        description={"저장한 영양성분을 삭제할까요?\n삭제하면 되돌릴 수 없어요"}
        cancelText="취소"
        confirmText="삭제"
        emphasis="cancel"
        confirmDisabled={isDeletePending}
        onConfirm={handleConfirmDelete}
      />

      {isDeletePending ? <LoadingOverlay label="영양성분을 삭제하는 중입니다." /> : null}
    </section>
  );
}
