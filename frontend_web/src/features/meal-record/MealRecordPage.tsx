import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import {
  DELETE_MEAL_RECORD_RESULT,
  useTodayMealRecordDeleteWithRollbackMutation,
  useTodayMealRecordRegisterMutation,
} from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import {
  formatMenuDraftKey,
  useMenuDraftClear,
  useMenuDraftInit,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftStore,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import { PATH } from "@/router/path";
import { getMealDetailPath, getMealRecordPath, getMealSearchPath } from "@/router/pathHelpers";
import {
  MEAL_TYPE_OPTIONS,
  type MealServingInputMode,
  type MealTime,
  type MealType,
  MENU_INPUT_MODE,
  type RegisterMealRequestDto,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useNavigate,
  useSearchParams,
  useStackflowBackHandler,
} from "@/shared/navigation/stackflowNavigation";
import { parseMealRecordTransferState } from "@/shared/types/mealRecordTransfer";

import styles from "./styles/MealRecordPage.module.css";
import { getMealType, getSafeDateKey } from "./utils/mealRecord.queryParams";

function toPositiveNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function scaleCaloriesByWeight(calories: number, nextWeight: number, currentWeight: number) {
  const safeCalories = toPositiveNumber(calories) ?? 0;
  const safeNextWeight = toPositiveNumber(nextWeight);
  const safeCurrentWeight = toPositiveNumber(currentWeight);
  if (safeNextWeight === null || safeCurrentWeight === null) {
    return safeCalories;
  }

  return safeCalories * (safeNextWeight / safeCurrentWeight);
}

function normalizeServingInputMode(mode: MealServingInputMode | undefined) {
  return mode === "unit" ? "unit" : "weight";
}

function toMenuInputMode(mode: MealServingInputMode | undefined) {
  return mode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT;
}

function buildMenuSignature(
  menus: Array<{ id: number; quantity: number; mode?: MealServingInputMode }>,
) {
  return menus
    .map((menu) => [menu.id, menu.quantity, normalizeServingInputMode(menu.mode)] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([id, quantity, mode]) => `${id}:${quantity}:${mode}`)
    .join("|");
}

type DisplayMenuItem = {
  id: number;
  name: string;
  brand?: string;
  calories: number;
  quantity: number;
  unit_quantity?: string;
  unit?: number;
  weight?: number;
  data_source?: number;
};

export default function MealRecordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const hasAppliedTransferRef = useRef(false);

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const draftKey = formatMenuDraftKey(dateKey, mealType);
  const transferState = useMemo(
    () => parseMealRecordTransferState(location.state),
    [location.state],
  );

  const { data: currentMenus, isPending: isSummaryReady } = useDayMealsQuery(dateKey);

  const { mutateAsync: registerMealAsync, isPending: isRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const { mutateAsync: deleteWithRollbackAsync, isPending: isDeletePending } =
    useTodayMealRecordDeleteWithRollbackMutation();
  const initDraft = useMenuDraftInit();
  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const clearDraft = useMenuDraftClear();
  const draftMenus = useMenuDraftMenus(dateKey, mealType);
  const allDrafts = useMenuDraftStore((store) => store.drafts);
  const hasCurrentDraft = Boolean(allDrafts[draftKey]);
  const draftPreviewsById = useMemo(
    () => allDrafts[draftKey]?.previewsById ?? {},
    [allDrafts, draftKey],
  );
  const mealImage = allDrafts[draftKey]?.image ?? currentMenus?.imagesByTime[mealType] ?? null;
  const currentMenuItems = (() => {
    if (!currentMenus) return [];
    return currentMenus.menusByTime[mealType];
  })();

  useEffect(() => {
    if (!currentMenus) {
      return;
    }

    const seedMenus = currentMenus.menusByTime[mealType].map((menu) => ({
      id: menu.id,
      quantity: menu.quantity,
      mode: menu.serving_input_mode,
    }));

    initDraft({
      key: draftKey,
      existingMenuCount: seedMenus.length,
      seedMenus,
      image: currentMenus.imagesByTime[mealType],
    });
  }, [currentMenus, dateKey, draftKey, initDraft, mealType]);

  useEffect(() => {
    if (hasAppliedTransferRef.current || !currentMenus || !transferState) {
      return;
    }

    if (transferState.dateKey !== dateKey || transferState.mealType !== mealType) {
      return;
    }

    const seedMenus = currentMenus.menusByTime[mealType].map((menu) => ({
      id: menu.id,
      quantity: menu.quantity,
      mode: menu.serving_input_mode,
    }));

    initDraft({
      key: draftKey,
      existingMenuCount: seedMenus.length,
      seedMenus,
      image: currentMenus.imagesByTime[mealType],
    });

    transferState.menus.forEach((menu) => {
      upsertMenu({
        key: draftKey,
        id: menu.id,
        quantity: menu.quantity,
      });
    });

    upsertPreviews({
      key: draftKey,
      previews: transferState.previews ?? [],
    });

    hasAppliedTransferRef.current = true;
    navigate(getMealRecordPath(dateKey, mealType), { replace: true });
  }, [
    currentMenus,
    dateKey,
    draftKey,
    initDraft,
    mealType,
    navigate,
    transferState,
    upsertMenu,
    upsertPreviews,
  ]);

  const menuById = useMemo(
    () => new Map(currentMenuItems.map((menu) => [menu.id, menu])),
    [currentMenuItems],
  );

  const displayMenuItems = useMemo(() => {
    const toDisplayItem = (menu: (typeof currentMenuItems)[number]): DisplayMenuItem => ({
      id: menu.id,
      name: menu.name,
      brand: menu.brand,
      calories: menu.calories,
      quantity: menu.quantity,
      unit_quantity: menu.unit_quantity,
      unit: menu.unit,
      weight: menu.weight,
      data_source: menu.data_source,
    });

    if (!hasCurrentDraft) {
      return currentMenuItems.map(toDisplayItem);
    }

    return draftMenus.reduce<DisplayMenuItem[]>((menus, draftMenu) => {
      const baseMenu = menuById.get(draftMenu.id);
      if (baseMenu) {
        const scaledCalories = scaleCaloriesByWeight(
          baseMenu.calories,
          draftMenu.quantity,
          baseMenu.quantity,
        );
        menus.push({
          ...toDisplayItem(baseMenu),
          calories: scaledCalories,
          quantity: draftMenu.quantity,
        });
        return menus;
      }

      const preview = draftPreviewsById[draftMenu.id];
      if (!preview) {
        return menus;
      }

      menus.push({
        id: preview.id,
        name: preview.name,
        brand: preview.brand,
        calories: preview.calories,
        quantity: draftMenu.quantity,
        unit_quantity: preview.unit_quantity,
        unit: preview.unit,
        weight: preview.weight,
        data_source: preview.data_source,
      });
      return menus;
    }, []);
  }, [currentMenuItems, draftMenus, draftPreviewsById, hasCurrentDraft, menuById]);

  const changedRequests = useMemo(() => {
    if (!currentMenus) {
      return [] as RegisterMealRequestDto[];
    }

    return MEAL_TYPE_OPTIONS.reduce<RegisterMealRequestDto[]>((requests, option) => {
      const type = option.key;
      const key = formatMenuDraftKey(dateKey, type);
      const draftByType = allDrafts[key];
      const draftMenusByType = draftByType?.existingMenus;
      if (!draftMenusByType) {
        return requests;
      }

      const currentMenusByType = currentMenus.menusByTime[type].map((menu) => ({
        id: menu.id,
        quantity: menu.quantity,
        mode: menu.serving_input_mode,
      }));
      if (buildMenuSignature(currentMenusByType) === buildMenuSignature(draftMenusByType)) {
        return requests;
      }

      const request: RegisterMealRequestDto = {
        date: dateKey,
        time: Number(type) as MealTime,
        menu_ids: draftMenusByType.map((menu) => menu.id),
        menu_quantities: draftMenusByType.map((menu) => menu.quantity),
        menu_input_modes: draftMenusByType.map((menu) => toMenuInputMode(menu.mode)),
      };

      if (typeof draftByType.image === "string" && draftByType.image.trim().length > 0) {
        request.image = draftByType.image;
      }

      requests.push(request);
      return requests;
    }, []);
  }, [allDrafts, currentMenus, dateKey]);

  const hasUnsavedChanges = changedRequests.length > 0;

  const totalCalories = useMemo(() => {
    return displayMenuItems.reduce((sum, menu) => {
      return sum + menu.calories;
    }, 0);
  }, [displayMenuItems]);

  const clearAllDrafts = useCallback(() => {
    MEAL_TYPE_OPTIONS.forEach((option) => {
      clearDraft(formatMenuDraftKey(dateKey, option.key));
    });
  }, [clearDraft, dateKey]);

  const handleChangeMealType = (nextMealType: MealType) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("date", dateKey);
    nextParams.set("mealType", String(nextMealType));
    setSearchParams(nextParams, { animate: false });
  };

  const handleRemoveMenu = (menuId: number) => {
    removeMenu({ key: draftKey, id: menuId });
  };

  const handleComplete = async () => {
    if (changedRequests.length === 0 || !currentMenus) {
      return;
    }

    try {
      for (const request of changedRequests) {
        if (request.menu_ids.length === 0) {
          const deleteResult = await deleteWithRollbackAsync({
            dateKey,
            request,
            currentMenusByTime: currentMenus.menusByTime,
          });

          if (deleteResult === DELETE_MEAL_RECORD_RESULT.FAILED_RECOVERED) {
            toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
            return;
          }

          if (deleteResult === DELETE_MEAL_RECORD_RESULT.FAILED_UNRECOVERED) {
            clearAllDrafts();
            toast.warning("서버가 불안정해요. 잠시 후 다시 시도해주세요.");
            navigate(PATH.DIARY, { replace: true });
            return;
          }

          continue;
        }

        await registerMealAsync(request);
      }

      clearAllDrafts();
      toast.success("식사 기록이 저장되었어요");
      navigate(PATH.DIARY, { replace: true });
    } catch {
      toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const isSavePending = isRegisterPending || isDeletePending;

  const handleMenuDetail = (menuId: number) => {
    navigate(getMealDetailPath(dateKey, mealType, menuId));
  };

  const handleBackGuard = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsExitConfirmOpen(true);
      return true;
    }

    clearAllDrafts();
    return false;
  }, [clearAllDrafts, hasUnsavedChanges]);

  useStackflowBackHandler(handleBackGuard);

  const handleBack = () => {
    navigateBack({ fallbackTo: PATH.DIARY });
  };

  const handleExit = () => {
    clearAllDrafts();
    navigateBack({ fallbackTo: PATH.DIARY, skipBackHandler: true });
  };

  const handleMealSearchNavigate = () => {
    const seedMenus = hasCurrentDraft
      ? draftMenus
      : currentMenuItems.map((menu) => ({
          id: menu.id,
          quantity: menu.quantity,
          mode: menu.serving_input_mode,
        }));

    initDraft({
      key: draftKey,
      existingMenuCount: seedMenus.length,
      seedMenus,
      image: mealImage,
    });

    navigate(getMealSearchPath(dateKey, mealType));
  };

  if (isSummaryReady) return <p> 로딩 중</p>;

  return (
    <section className={styles.page}>
      <PageHeader title="식사 기록 상세" onBack={handleBack} />

      <main className={styles.content}>
        <section className={styles.summarySection}>
          <article className={styles.summaryCard}>
            <p className="typo-title3">섭취 칼로리</p>

            <div className={styles.calorieRow}>
              <span className={`${styles.currentCalorie} typo-h2`}>
                {totalCalories.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
              </span>
              <span className="typo-title2">kcal</span>
            </div>
          </article>
        </section>

        <div className="dividerMargin20 divider" />

        <section className={styles.mealTypeSection}>
          <div className={styles.mealTypeButtonGroup}>
            {MEAL_TYPE_OPTIONS.map((option) => {
              const isActive = option.key === mealType;

              return (
                <button
                  key={option.key}
                  type="button"
                  className={`${styles.mealTypeButton} ${isActive ? styles.mealTypeActive : ""}`}
                  onClick={() => handleChangeMealType(option.key)}
                  aria-pressed={isActive}
                >
                  <span className="typo-label3">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.menuSection}>
          {mealImage ? (
            <article className={styles.photoGroupCard}>
              <div className={styles.imgContainer}>
                <img src={mealImage} alt="식사 사진" className={styles.photoImage} />
              </div>

              <div className="divider" />
            </article>
          ) : null}

          {displayMenuItems.length > 0 ? (
            <div className={styles.menuList}>
              {displayMenuItems.map((menu, index) => (
                <MealMenuCard
                  key={`${mealType}-${menu.id}-${index}`}
                  name={menu.name}
                  calories={menu.calories}
                  unit_quantity={menu.unit_quantity}
                  quantity={menu.quantity}
                  brand={menu.brand}
                  unit={menu.unit}
                  weight={menu.weight}
                  data_source={menu.data_source}
                  icon="delete"
                  onIconClick={() => handleRemoveMenu(menu.id)}
                  onClick={() => handleMenuDetail(menu.id)}
                />
              ))}
            </div>
          ) : (
            <button type="button" className={styles.emptyState} onClick={handleMealSearchNavigate}>
              <div className={styles.emptyStateIcon}>
                <PlusIcon size={24} />
              </div>
              <p className="typo-title2">기록하러 가볼까요?</p>
            </button>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={handleMealSearchNavigate}
          variant="outlined"
          interaction="normal"
          size="large"
          color="primary"
          fullWidth
        >
          추가하기
        </Button>

        <Button
          onClick={() => {
            void handleComplete();
          }}
          variant="filled"
          interaction={hasUnsavedChanges && !isSavePending ? "normal" : "disable"}
          size="large"
          color="primary"
          fullWidth
          disabled={!hasUnsavedChanges || isSavePending}
        >
          완료하기
        </Button>
      </footer>

      <ConfirmModal
        open={isExitConfirmOpen}
        onOpenChange={setIsExitConfirmOpen}
        title="변경사항을 저장하지 않고 나갈까요?"
        cancelText="나가기"
        confirmText="계속 수정"
        onCancel={handleExit}
        onConfirm={() => {}}
      />
    </section>
  );
}
