import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
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
  useMenuDraftRemoveImage,
  useMenuDraftStore,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import {
  buildMenuDraftSignature,
  normalizeServingInputMode,
  toMenuDraftSeed,
} from "@/features/meal-record/utils/menuDraftSync";
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
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
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

function scaleCaloriesByWeight(
  calories: number,
  nextWeight: number | null | undefined,
  currentWeight: number | null | undefined,
) {
  const safeCalories = toPositiveNumber(calories) ?? 0;
  const safeNextWeight = toPositiveNumber(nextWeight);
  const safeCurrentWeight = toPositiveNumber(currentWeight);
  if (safeNextWeight === null || safeCurrentWeight === null) {
    return safeCalories;
  }

  return safeCalories * (safeNextWeight / safeCurrentWeight);
}

function toMenuInputMode(mode: MealServingInputMode | undefined) {
  return mode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT;
}

function normalizeMealImage(image: string | null | undefined) {
  if (typeof image !== "string") {
    return undefined;
  }

  const trimmedImage = image.trim();
  return trimmedImage.length > 0 ? trimmedImage : undefined;
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
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const removeImage = useMenuDraftRemoveImage();
  const clearDraft = useMenuDraftClear();
  const draftMenus = useMenuDraftMenus(dateKey, mealType);
  const allDrafts = useMenuDraftStore((store) => store.drafts);
  const currentDraft = allDrafts[draftKey];
  const hasCurrentDraft = Boolean(currentDraft);
  const draftPreviewsById = useMemo(
    () => allDrafts[draftKey]?.previewsById ?? {},
    [allDrafts, draftKey],
  );
  const mealImage =
    currentDraft?.image === null
      ? null
      : (normalizeMealImage(currentDraft?.image ?? currentMenus?.imagesByTime[mealType]) ?? null);
  const didNotEat = Boolean(currentMenus?.didNotEatByTime[mealType]);
  const currentMenuItems = useMemo(
    () => currentMenus?.menusByTime[mealType] ?? [],
    [currentMenus, mealType],
  );
  const currentSeedMenus = useMemo(() => currentMenuItems.map(toMenuDraftSeed), [currentMenuItems]);
  const currentServerSignature = useMemo(
    () =>
      buildMenuDraftSignature({
        menus: currentSeedMenus,
        image: currentMenus?.imagesByTime[mealType],
      }),
    [currentMenus, currentSeedMenus, mealType],
  );

  useEffect(() => {
    if (!currentMenus) {
      return;
    }

    initDraft({
      key: draftKey,
      existingMenuCount: currentSeedMenus.length,
      seedMenus: currentSeedMenus,
      image: currentMenus.imagesByTime[mealType],
      serverSignature: currentServerSignature,
    });
  }, [currentMenus, currentSeedMenus, currentServerSignature, draftKey, initDraft, mealType]);

  useEffect(() => {
    if (hasAppliedTransferRef.current || !currentMenus || !transferState) {
      return;
    }

    if (transferState.dateKey !== dateKey || transferState.mealType !== mealType) {
      return;
    }

    const nextMenuIds = new Set(transferState.menus.map((menu) => menu.id));

    if (nextMenuIds.size > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      hasAppliedTransferRef.current = true;
      navigate(getMealRecordPath(dateKey, mealType), { replace: true });
      return;
    }

    clearDraft(draftKey);
    initDraft({
      key: draftKey,
      existingMenuCount: currentSeedMenus.length,
      seedMenus: transferState.menus,
      image: currentMenus.imagesByTime[mealType],
      serverSignature: currentServerSignature,
    });

    upsertPreviews({
      key: draftKey,
      previews: transferState.previews ?? [],
    });

    hasAppliedTransferRef.current = true;
    navigate(getMealRecordPath(dateKey, mealType), { replace: true });
  }, [
    currentMenus,
    currentSeedMenus,
    currentServerSignature,
    dateKey,
    clearDraft,
    draftKey,
    initDraft,
    mealType,
    navigate,
    transferState,
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
        calories: scaleCaloriesByWeight(preview.calories, draftMenu.quantity, preview.weight),
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
      const hasMenuChanged =
        buildMenuSignature(currentMenusByType) !== buildMenuSignature(draftMenusByType);
      const currentImage = normalizeMealImage(currentMenus.imagesByTime[type]);
      const nextImage =
        draftByType.image === null
          ? undefined
          : normalizeMealImage(draftByType.image ?? currentImage);
      const hasImageChanged = draftByType.image !== undefined && nextImage !== currentImage;

      if (!hasMenuChanged && !hasImageChanged) {
        return requests;
      }

      const request: RegisterMealRequestDto = {
        date: dateKey,
        time: Number(type) as MealTime,
        menu_ids: draftMenusByType.map((menu) => menu.id),
        menu_quantities: draftMenusByType.map((menu) => menu.quantity),
        menu_input_modes: draftMenusByType.map((menu) => toMenuInputMode(menu.mode)),
      };

      if (nextImage) {
        request.image = nextImage;
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
  const showDidNotEatState = didNotEat && displayMenuItems.length === 0;

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

  const handleRemoveImage = () => {
    if (!currentMenus) {
      return;
    }

    if (!hasCurrentDraft) {
      initDraft({
        key: draftKey,
        existingMenuCount: currentSeedMenus.length,
        seedMenus: currentSeedMenus,
        image: currentMenus.imagesByTime[mealType],
        serverSignature: currentServerSignature,
      });
    }

    removeImage({ key: draftKey });
  };

  const getCanceledMenusFromRequest = (request: RegisterMealRequestDto) => {
    if (!currentMenus) {
      return [];
    }

    const nextMenuIdSet = new Set(request.menu_ids ?? []);
    return currentMenus.menusByTime[request.time]
      .filter((menu) => !nextMenuIdSet.has(menu.id))
      .map((menu) => ({
        menu_id: menu.id,
        menu_name: menu.name,
      }));
  };

  const handleComplete = async () => {
    if (!currentMenus || isSavePending) {
      return;
    }

    try {
      if (changedRequests.length === 0) {
        clearAllDrafts();
        toast.success("식사 기록이 저장되었어요");
        navigateBack({ fallbackTo: PATH.DIARY });
        return;
      }

      if (
        changedRequests.some((request) => (request.menu_ids?.length ?? 0) > MAX_MEAL_RECORD_MENUS)
      ) {
        toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
        return;
      }

      for (const request of changedRequests) {
        const canceledMenus = getCanceledMenusFromRequest(request);

        if ((request.menu_ids?.length ?? 0) === 0) {
          const deleteResult = await deleteWithRollbackAsync({
            dateKey,
            request,
            currentMenusByTime: currentMenus.menusByTime,
            analytics: {
              recommendMenuCancel: canceledMenus,
            },
          });

          if (deleteResult === DELETE_MEAL_RECORD_RESULT.FAILED_RECOVERED) {
            toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
            return;
          }

          if (deleteResult === DELETE_MEAL_RECORD_RESULT.FAILED_UNRECOVERED) {
            clearAllDrafts();
            toast.warning("서버가 불안정해요. 잠시 후 다시 시도해주세요.");
            navigateBack({ fallbackTo: PATH.DIARY });
            return;
          }

          continue;
        }

        await registerMealAsync({
          ...request,
          analytics: {
            recommendMenuCancel: canceledMenus,
          },
        });
      }

      clearAllDrafts();
      navigateBack({ fallbackTo: PATH.DIARY, skipBackHandler: true });
      toast.success("식사 기록이 저장되었어요");
    } catch {
      toast.warning("식사 기록 저장에 실패했어요", "잠시 후 다시 시도해주세요.");
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
      serverSignature: currentServerSignature,
    });

    navigate(getMealSearchPath(dateKey, mealType));
  };

  if (isSummaryReady) return <MealRecordPageSkeleton onBack={handleBack} />;

  return (
    <section className={styles.page}>
      <PageHeader title="식사 기록 상세" onBack={handleBack} />

      <main className={styles.content}>
        <article className={styles.summaryCard}>
          <p className="typo-title2">섭취 칼로리</p>

          <div className={`${styles.calorieRow} textNoWrap`}>
            <span className={`${styles.textPrimary} typo-h2`}>
              {totalCalories.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
            </span>
            <span className="typo-caption1">kcal</span>
          </div>
        </article>

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
                <button
                  type="button"
                  className={styles.photoDeleteButton}
                  onClick={handleRemoveImage}
                  aria-label="식사 사진 삭제"
                >
                  <SystemIcon name="close" size={28} />
                </button>
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
          ) : showDidNotEatState ? (
            <article className={styles.didNotEatState}>
              <img
                src="/icons/character-not-eat.svg"
                alt=""
                aria-hidden="true"
                className={styles.didNotEatImage}
              />
              <p className="typo-body1">안 먹었어요</p>
            </article>
          ) : (
            <button type="button" className={styles.emptyState} onClick={handleMealSearchNavigate}>
              <div className={styles.emptyStateIcon}>
                <SystemIcon name="circle-plus-large" mode="image" size={32} />
              </div>
              <p className="typo-body1">기록하러 가볼까요?</p>
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
          interaction="normal"
          size="large"
          color="primary"
          fullWidth
          disabled={isSavePending}
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

      {isSavePending ? <LoadingOverlay label="식사 기록을 저장하는 중입니다." /> : null}
    </section>
  );
}

function MealRecordPageSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <section className={styles.page}>
      <PageHeader title="식사 기록 상세" onBack={onBack} />

      <main className={styles.content}>
        <SkeletonStatus label="식사 기록 상세를 불러오는 중입니다.">
          <section className={styles.summarySection}>
            <article className={styles.summaryCard}>
              <Skeleton width="28%" height={22} radius={999} />
              <div className={styles.calorieRow}>
                <Skeleton width={112} height={36} radius={999} />
                <Skeleton width={40} height={22} radius={999} />
              </div>
            </article>
          </section>

          <div className="dividerMargin20 divider" />

          <section className={styles.mealTypeSection}>
            <div className={styles.mealTypeButtonGroup}>
              {MEAL_TYPE_OPTIONS.map((option) => (
                <Skeleton key={option.key} width={58} height={34} radius={999} />
              ))}
            </div>
          </section>

          <section className={styles.menuSection}>
            <div className={styles.menuList}>
              {Array.from({ length: 3 }).map((_, index) => (
                <article key={index} className={styles.menuCardSkeleton}>
                  <div className={styles.menuCardSkeletonHeader}>
                    <Skeleton width="52%" height={24} radius={999} />
                    <Skeleton width={24} height={24} variant="circle" />
                  </div>
                  <div className={styles.menuCardSkeletonMeta}>
                    <Skeleton width="38%" height={16} radius={999} />
                    <Skeleton width="28%" height={20} radius={999} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </SkeletonStatus>
      </main>

      <footer className={styles.footer}>
        <Skeleton width="100%" height={48} radius={8} />
        <Skeleton width="100%" height={48} radius={8} />
      </footer>
    </section>
  );
}
