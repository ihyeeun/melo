import { useEffect, useMemo, useState } from "react";

import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { MealMenuNutrientDetailSkeleton } from "@/features/meal-record/components/MealMenuNutrientDetailSkeleton";
import { useMealDeleteMutation } from "@/features/meal-record/hooks/mutations/useMealDetailMutation";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import styles from "@/features/meal-record/styles/MealDetailPage.module.css";
import type { NutrientModifyLocationState } from "@/features/nutrient-entry/types/nutrientEntry.state";
import {
  FOLDER_MENU_LIMIT_MESSAGE,
  MAX_FOLDER_MENUS,
} from "@/features/personal-menu/folder/constants/folder.constants";
import {
  useFolderDraftSelectedMenus,
  useFolderDraftUpsertSelectedMenu,
} from "@/features/personal-menu/folder/stores/folderDraft.store";
import {
  MAX_MENU_SET_MENUS,
  MENU_SET_MENU_LIMIT_MESSAGE,
} from "@/features/personal-menu/set/constants/menuSet.constants";
import {
  useMenuSetDraftSelectedMenus,
  useMenuSetDraftUpsertSelectedMenu,
} from "@/features/personal-menu/set/stores/menuSetDraft.store";
import { PATH } from "@/router/path";
import {
  getFolderMenuSearchPath,
  getMealRecordPath,
  getMenuSetMenuSearchPath,
} from "@/router/pathHelpers";
import {
  type MealMenuItem,
  type MealServingInputMode,
  MENU_DATA_SOURCE,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  resetStackflow,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import { MAX_MEAL_RECORD_MENUS, MEAL_RECORD_MENU_LIMIT_MESSAGE } from "./constants/menu.constants";
import { getMealType, getSafeDateKey, getSafeKeyword } from "./utils/mealRecord.queryParams";

const FOLDER_DETAIL_MODE = "folder";
const SET_DETAIL_MODE = "set";

type MealDetailLocationState = {
  afterAddReturnPath?: string;
  backReturnPath?: string;
  initialMode?: MealServingInputMode;
  initialQuantity?: number;
  replaceMenuId?: number;
};

function getSafeInitialSelection(state: MealDetailLocationState | null) {
  const quantity = state?.initialQuantity;
  const mode = state?.initialMode;

  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  return {
    quantity,
    mode: mode === "unit" || mode === "weight" ? mode : undefined,
  };
}

function getMenuIsDeleted(menu: unknown) {
  const isDeleted = (menu as { is_deleted?: unknown }).is_deleted;
  return typeof isDeleted === "number" ? isDeleted : 0;
}

export default function MealDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selection, setSelection] = useState<MealMenuNutrientSelection | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const searchKeyword = getSafeKeyword(searchParams.get("keyword"));
  const isFolderDetailMode = searchParams.get("mode") === FOLDER_DETAIL_MODE;
  const isSetDetailMode = searchParams.get("mode") === SET_DETAIL_MODE;
  const isPersonalMenuEditMode = isFolderDetailMode || isSetDetailMode;
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const rawMenuId = searchParams.get("menuId");
  const parsedMenuId = rawMenuId ? Number(rawMenuId) : null;
  const menuId =
    parsedMenuId !== null && Number.isInteger(parsedMenuId) && parsedMenuId > 0
      ? parsedMenuId
      : null;

  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const mealSelectedMenus = useMenuDraftMenus(dateKey, mealType);
  const folderSelectedMenus = useFolderDraftSelectedMenus();
  const upsertFolderSelectedMenu = useFolderDraftUpsertSelectedMenu();
  const menuSetSelectedMenus = useMenuSetDraftSelectedMenus();
  const upsertMenuSetSelectedMenu = useMenuSetDraftUpsertSelectedMenu();
  const locationState = location.state as MealDetailLocationState | null;
  const replaceMenuIdCandidate = locationState?.replaceMenuId;
  const replaceMenuId =
    typeof replaceMenuIdCandidate === "number" &&
    Number.isInteger(replaceMenuIdCandidate) &&
    replaceMenuIdCandidate > 0 &&
    replaceMenuIdCandidate !== menuId
      ? replaceMenuIdCandidate
      : null;

  const { data: meal, isPending, isError } = useMealDetailQuery(menuId);

  const getBackFallbackPath = () => {
    if (isFolderDetailMode) {
      return getFolderMenuSearchPath();
    }

    if (isSetDetailMode) {
      return getMenuSetMenuSearchPath();
    }

    return getMealRecordPath(dateKey, mealType);
  };

  const handleGoBack = () => {
    if (locationState?.backReturnPath) {
      resetStackflow(locationState.backReturnPath, { animate: false });
      return;
    }

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

    if (isFolderDetailMode) {
      const folderSelection =
        folderSelectedMenus.find((item) => item.requestMenu.menuId === menuId) ?? null;

      if (!folderSelection) {
        return null;
      }

      return {
        quantity: folderSelection.requestMenu.menuQuantity,
        mode: folderSelection.requestMenu.menuInputMode,
      };
    }

    if (isSetDetailMode) {
      const menuSetSelection =
        menuSetSelectedMenus.find((item) => item.requestMenu.menuId === menuId) ?? null;

      if (!menuSetSelection) {
        return null;
      }

      return {
        quantity: menuSetSelection.requestMenu.menuQuantity,
        mode: menuSetSelection.requestMenu.menuInputMode,
      };
    }

    const mealSelection = mealSelectedMenus.find((item) => item.id === menuId) ?? null;

    if (mealSelection) {
      return {
        quantity: mealSelection.quantity,
        mode: mealSelection.mode,
      };
    }

    return getSafeInitialSelection(locationState);
  }, [
    folderSelectedMenus,
    isFolderDetailMode,
    isSetDetailMode,
    locationState,
    mealSelectedMenus,
    menuId,
    menuSetSelectedMenus,
  ]);
  const isAlreadyQueued = useMemo(() => {
    if (menuId === null) {
      return false;
    }

    if (isFolderDetailMode) {
      return folderSelectedMenus.some((item) => item.requestMenu.menuId === menuId);
    }

    if (isSetDetailMode) {
      return menuSetSelectedMenus.some((item) => item.requestMenu.menuId === menuId);
    }

    return mealSelectedMenus.some((item) => item.id === menuId);
  }, [
    folderSelectedMenus,
    isFolderDetailMode,
    isSetDetailMode,
    mealSelectedMenus,
    menuId,
    menuSetSelectedMenus,
  ]);

  useEffect(() => {
    // 이미 draft에 담긴 메뉴를 수정한 경우, "담기"를 다시 누르지 않아도 preview를 최신 데이터로 동기화한다.
    if (isPersonalMenuEditMode || !meal || menuId === null || !existingSelection) {
      return;
    }

    upsertPreviews({
      key: draftKey,
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
  }, [draftKey, existingSelection, isPersonalMenuEditMode, meal, menuId, upsertPreviews]);

  const handleAddMenu = () => {
    if (!meal || !selection) {
      toast.warning("입력값을 다시 확인해주세요");
      return;
    }

    const nextMenuId = selection.menu.id;

    if (isSetDetailMode) {
      const nextSelectedMenuIds = new Set(
        menuSetSelectedMenus.map((item) => item.requestMenu.menuId),
      );
      nextSelectedMenuIds.add(nextMenuId);

      if (nextSelectedMenuIds.size > MAX_MENU_SET_MENUS) {
        toast.warning(MENU_SET_MENU_LIMIT_MESSAGE);
        return;
      }

      upsertMenuSetSelectedMenu({
        viewMenu: selection.menu,
        menuQuantity: selection.quantity,
        menuInputMode: selection.mode,
      });

      navigateBack({
        fallbackTo: locationState?.backReturnPath ?? getBackFallbackPath(),
      });
      return;
    }

    if (isFolderDetailMode) {
      const nextSelectedMenuIds = new Set(
        folderSelectedMenus.map((item) => item.requestMenu.menuId),
      );
      nextSelectedMenuIds.add(nextMenuId);

      if (nextSelectedMenuIds.size > MAX_FOLDER_MENUS) {
        toast.warning(FOLDER_MENU_LIMIT_MESSAGE);
        return;
      }

      upsertFolderSelectedMenu({
        viewMenu: selection.menu,
        menuQuantity: selection.quantity,
        menuInputMode: selection.mode,
      });

      navigateBack({
        fallbackTo: locationState?.backReturnPath ?? getBackFallbackPath(),
      });
      return;
    }

    const shouldReplaceMenu =
      replaceMenuId !== null &&
      replaceMenuId !== nextMenuId &&
      mealSelectedMenus.some((item) => item.id === replaceMenuId);

    const nextSelectedMenuIds = new Set(mealSelectedMenus.map((item) => item.id));
    if (shouldReplaceMenu) {
      nextSelectedMenuIds.delete(replaceMenuId);
    }
    nextSelectedMenuIds.add(nextMenuId);

    if (nextSelectedMenuIds.size > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return;
    }

    if (shouldReplaceMenu) {
      removeMenu({ key: draftKey, id: replaceMenuId });
    }

    upsertMenu({
      key: draftKey,
      id: nextMenuId,
      quantity: selection.quantity,
      mode: selection.mode,
    });

    // MealRecordPage는 현재 식단 목록에 없는 id를 렌더링할 때 draft preview를 사용한다.
    // 새로 생성된 개인 메뉴(id 변경)는 summary 목록에 아직 없으므로 preview를 함께 저장해야 즉시 보인다.
    const previewMenu = selection.menu.id === meal.id ? meal : selection.menu;
    upsertPreviews({
      key: draftKey,
      previews: [
        {
          id: nextMenuId,
          name: previewMenu.name,
          brand: previewMenu.brand,
          unit_quantity: previewMenu.unit_quantity,
          calories: previewMenu.calories,
          weight: previewMenu.weight ?? undefined,
          unit: previewMenu.unit,
          data_source: previewMenu.data_source,
        },
      ],
    });

    const backFallbackPath = getBackFallbackPath();

    if (locationState?.afterAddReturnPath) {
      resetStackflow(locationState.afterAddReturnPath, { animate: false });
      return;
    }

    navigateBack({
      fallbackTo: backFallbackPath,
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

  const getNutrientModifyPath = (targetMenuId: number) => {
    const modifyQueryParams = new URLSearchParams({
      date: dateKey,
      mealType,
      menuId: String(targetMenuId),
    });
    if (isFolderDetailMode) {
      modifyQueryParams.set("mode", FOLDER_DETAIL_MODE);
    }
    if (isSetDetailMode) {
      modifyQueryParams.set("mode", SET_DETAIL_MODE);
    }
    if (searchKeyword.length > 0) {
      modifyQueryParams.set("keyword", searchKeyword);
    }

    return `${PATH.NUTRIENT_ADD_MODIFY}?${modifyQueryParams.toString()}`;
  };

  const handleEditAndAdd = () => {
    if (isPersonalMenuData) {
      navigate(getNutrientModifyPath(meal.id));
      return;
    }

    moveToNutrientModify(selection?.menu ?? meal);
  };

  const moveToNutrientModify = (menuToModify: MealMenuItem) => {
    const state: NutrientModifyLocationState = {
      menu: menuToModify,
    };

    navigate(getNutrientModifyPath(menuToModify.id), { state });
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
            showEditSection={meal.data_source === MENU_DATA_SOURCE.PUBLIC || mealIsDeleted === 0}
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
          disabled={!selection}
        >
          {isAlreadyQueued ? "수정하기" : "담기"}
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
