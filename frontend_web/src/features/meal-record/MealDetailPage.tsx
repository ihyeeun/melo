import { Menu } from "@base-ui/react/menu";
import { EllipsisVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { useMealDeleteMutation } from "@/features/meal-record/hooks/mutations/useMealDetailMutation";
import { useMealDetatilQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import {
  formatMenuDraftKey,
  useMenuDraftInit,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import styles from "@/features/meal-record/styles/MealDetailPage.module.css";
import type { NutrientModifyLocationState } from "@/features/nutrient-entry/types/nutrientEntry.state";
import { PATH } from "@/router/path";
import type { PageKey } from "@/router/pathHelpers";
import { type MealMenuItem, MENU_DATA_SOURCE, MENU_UNIT } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBackOrFallback } from "@/shared/navigation/backNavigation";
import {
  navigateBack,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import { MAX_MEAL_RECORD_MENUS } from "./constants/menu.constants";
import { getMealRecordAddSearchPath, getMealRecordPath } from "./utils/mealRecord.paths";
import { getMealType, getSafeDateKey, getSafeKeyword } from "./utils/mealRecord.queryParams";

type MealDetailLocationState = {
  replaceMenuId?: number;
};

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
  const rawPageKey = searchParams.get("pageKey");
  const pageKey: PageKey | null =
    rawPageKey === "MEAL_SEARCH" || rawPageKey === "MEAL_RECORD" ? rawPageKey : null;
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const rawMenuId = searchParams.get("menuId");
  const parsedMenuId = rawMenuId ? Number(rawMenuId) : null;
  const menuId =
    parsedMenuId !== null && Number.isInteger(parsedMenuId) && parsedMenuId > 0
      ? parsedMenuId
      : null;

  const initDraft = useMenuDraftInit();
  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const selectedMenus = useMenuDraftMenus(dateKey, mealType);
  const locationState = location.state as MealDetailLocationState | null;
  const replaceMenuIdCandidate = locationState?.replaceMenuId;
  const replaceMenuId =
    typeof replaceMenuIdCandidate === "number" &&
    Number.isInteger(replaceMenuIdCandidate) &&
    replaceMenuIdCandidate > 0 &&
    replaceMenuIdCandidate !== menuId
      ? replaceMenuIdCandidate
      : null;

  const { data: meal, isPending, isError } = useMealDetatilQuery(menuId);
  const { mutate: deleteMealMutation, isPending: isDeletePending } = useMealDeleteMutation({
    onSuccess: () => {
      toast.success("삭제되었어요");
      handleGoBack();
    },
  });

  useEffect(() => {
    initDraft({
      key: draftKey,
      existingMenuCount: 0,
    });
  }, [draftKey, initDraft]);

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

    return selectedMenus.find((item) => item.id === menuId) ?? null;
  }, [menuId, selectedMenus]);
  const isAlreadyQueued = existingSelection !== null;

  useEffect(() => {
    // 이미 draft에 담긴 메뉴를 수정한 경우, "담기"를 다시 누르지 않아도 preview를 최신 데이터로 동기화한다.
    if (!meal || menuId === null || !existingSelection) {
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
  }, [draftKey, existingSelection, meal, menuId, upsertPreviews]);

  const handleAddMenu = () => {
    if (!meal || !selection) {
      toast.warning("입력값을 다시 확인해주세요");
      return;
    }

    const nextMenuId = selection.menu.id;
    const shouldReplaceMenu =
      replaceMenuId !== null &&
      replaceMenuId !== nextMenuId &&
      selectedMenus.some((item) => item.id === replaceMenuId);

    const nextSelectedMenuIds = new Set(selectedMenus.map((item) => item.id));
    if (shouldReplaceMenu) {
      nextSelectedMenuIds.delete(replaceMenuId);
    }
    nextSelectedMenuIds.add(nextMenuId);

    if (nextSelectedMenuIds.size > MAX_MEAL_RECORD_MENUS) {
      toast.warning("최대 100개까지 기록할 수 있어요");
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

    handleGoBack();
  };

  if (isPending) {
    return <p>로딩 중..</p>;
  }

  if (!meal || menuId === null) {
    return null;
  }

  const isPersonalMenuData = meal.data_source === MENU_DATA_SOURCE.PERSONAL;

  const getBackFallbackPath = () => {
    if (pageKey === "MEAL_SEARCH") {
      return getMealRecordAddSearchPath(dateKey, mealType, searchKeyword);
    }

    if (pageKey === "MEAL_RECORD") {
      return getMealRecordPath(dateKey, mealType);
    }

    return PATH.HOME;
  };

  const handleGoBack = () => {
    navigateBack({ fallbackTo: getBackFallbackPath() });
  };

  const handleHeaderBack = () => {
    navigateBackOrFallback(navigate, getBackFallbackPath());
  };

  const handleModify = () => {
    moveToNutrientModify(meal, existingSelection?.quantity ?? 1, existingSelection !== null);
  };

  const handleEditAndAdd = () => {
    moveToNutrientModify(selection?.menu ?? meal, selection?.quantity ?? 1, false);
  };

  const moveToNutrientModify = (
    menuToModify: MealMenuItem,
    quantity: number,
    wasQueuedInDraft: boolean,
  ) => {
    const nextPageKey = pageKey ?? "MEAL_RECORD";
    const modifyQueryParams = new URLSearchParams({
      date: dateKey,
      mealType,
      menuId: String(menuToModify.id),
      pageKey: nextPageKey,
    });
    if (searchKeyword.length > 0) {
      modifyQueryParams.set("keyword", searchKeyword);
    }
    const normalizedUnit = menuToModify.unit ?? meal.unit;

    const state: NutrientModifyLocationState = {
      dataSource: menuToModify.data_source ?? meal.data_source,
      source: "meal-record",
      menuId: menuToModify.id,
      menu: menuToModify,
      quantity,
      dateKey,
      mealType,
      pageKey: nextPageKey,
      wasQueuedInDraft,
      brandName: menuToModify.brand ?? meal.brand,
      foodName: menuToModify.name ?? meal.name,
      servingUnit: normalizedUnit === MENU_UNIT.MILLILITER ? "ml" : "g",
    };

    navigate(`${PATH.NUTRIENT_ADD_MODIFY}?${modifyQueryParams.toString()}`, { state });
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
        onBack={handleHeaderBack}
        rightSlot={
          isPersonalMenuData && (
            <div className={styles.headerButtons}>
              <Menu.Root>
                <Menu.Trigger>
                  <EllipsisVertical size={20} />
                </Menu.Trigger>

                <Menu.Portal>
                  <Menu.Positioner className={styles.menuPositioner} sideOffset={8}>
                    <Menu.Popup>
                      <Menu.Item
                        onClick={handleModify}
                        className={`${styles.menuItem} typo-label3`}
                      >
                        수정
                      </Menu.Item>
                      <Menu.Separator className="divider" />
                      <Menu.Item
                        onClick={handleDelete}
                        className={`${styles.menuItem} typo-label3`}
                      >
                        삭제
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </div>
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
            showEditSection={!isPersonalMenuData}
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
    </section>
  );
}
