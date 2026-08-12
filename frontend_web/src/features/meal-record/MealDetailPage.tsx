import { useEffect, useMemo, useState } from "react";

import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { MealMenuNutrientDetailSkeleton } from "@/features/meal-record/components/MealMenuNutrientDetailSkeleton";
import { useMealDeleteMutation } from "@/features/meal-record/hooks/mutations/useMealDetailMutation";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import { useMenuDraftUpsertPreviews } from "@/features/meal-record/stores/menuDraft.store";
import styles from "@/features/meal-record/styles/MealDetailPage.module.css";
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
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { type MealMenuItem, MENU_DATA_SOURCE } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import { getMealType, getSafeDateKey } from "./utils/mealRecord.queryParams";

function getMenuIsDeleted(menu: unknown) {
  const isDeleted = (menu as { is_deleted?: unknown }).is_deleted;
  return typeof isDeleted === "number" ? isDeleted : 0;
}

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

  const { data: meal, isPending, isError } = useMealDetailQuery(menuId);

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

  const { mutate: deleteMealMutation, isPending: isDeletePending } = useMealDeleteMutation({
    onSuccess: () => {
      toast.success("삭제되었어요");
      handleGoBack();
    },
  });

  useEffect(() => {
    if (menuId !== null) {
      return;
    }

    toast.warning("잘못된 접근입니다.");

    navigate(PATH.HOME, { replace: true });
  }, [dateKey, mealType, menuId, navigate]);

  useEffect(() => {
    if (!isError) {
      return;
    }

    toast.warning("메뉴 정보를 불러오지 못했어요");
    navigate(PATH.HOME, { replace: true });
  }, [dateKey, isError, mealType, navigate]);

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

    navigateBack({
      fallbackTo: getBackFallbackPath(),
    });
  };

  if (isPending) {
    return (
      <section className={styles.page}>
        <PageHeader title="영양성분 상세" onBack={handleGoBack} />

        <main className={styles.main}>
          <div className={styles.content}>
            <MealMenuNutrientDetailSkeleton />
          </div>
        </main>

        <footer className={styles.footer}>
          <Skeleton width="100%" height={48} radius={8} />
        </footer>
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
    ? "삭제된 메뉴라 담을 수 없어요"
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

    moveToNutrientModify(selection?.menu ?? meal, {
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
    <section className={styles.page}>
      <PageHeader
        title="영양성분 상세"
        onBack={handleGoBack}
        rightSlot={
          isPersonalMenuData &&
          mealIsDeleted === 0 && (
            <Button variant="text" color="normal" onClick={handleDelete}>
              삭제
            </Button>
          )
        }
      />

      <main className={styles.main}>
        <div className={styles.content}>
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
        </div>
      </main>

      <footer className={styles.footer}>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={handleAddMenu}
          interaction={selection ? "normal" : "disable"}
          disabled={!selection || mealIsDeleted !== 0}
        >
          {footerButtonLabel}
        </Button>
      </footer>

      <ConfirmModal
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="영양 성분 삭제"
        description="영양 성분을 삭제할까요?"
        cancelText="취소"
        confirmText="삭제"
        confirmDisabled={isDeletePending}
        onConfirm={handleConfirmDelete}
      />

      {isDeletePending ? <LoadingOverlay label="영양성분을 삭제하는 중입니다." /> : null}
    </section>
  );
}
