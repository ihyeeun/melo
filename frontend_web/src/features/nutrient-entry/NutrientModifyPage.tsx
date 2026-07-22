import { useEffect, useMemo, useState } from "react";

import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import {
  getMealType,
  getSafeDateKey,
  getSafeMenuId,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  useMenuSelectionFlowById,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  getMenuSelectionFlowIdFromSearchParams,
  getMenuSelectionFlowMenuDetailPath,
  getMenuSelectionFlowSearchPath,
} from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";
import { type RegisterManualMenuPayload } from "@/features/nutrient-entry/api/nutrient";
import { NutrientDetailForm } from "@/features/nutrient-entry/components/NutrientDetailForm";
import {
  useModifyNutrientMutation,
  useRegisterMenuMutation,
} from "@/features/nutrient-entry/hooks/mutations/useNutrientMutation";
import type { NutrientModifyLocationState } from "@/features/nutrient-entry/types/nutrientEntry.state";
import {
  buildNullableNutrientFields,
  buildNutrientFormFields,
  buildNutrientResetPatch,
  toFiniteNumberOrUndefined,
  toNullableFiniteNumber,
} from "@/features/nutrient-entry/utils/nutrientFields";
import { PATH } from "@/router/path";
import {
  getMealDetailPath,
  getMealRecordPath,
} from "@/router/pathHelpers";
import {
  type MealMenuItem,
  MENU_DATA_SOURCE,
  MENU_NUTRIENT_FIELD_KEYS,
  MENU_UNIT,
  type MenuNutrientFields,
  type MenuUnit,
  type RegisterMenuRequestDto,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  navigateBackAndPush,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/NutrientModifyPage.module.css";

function buildInitialFormState(
  menu?: Partial<MealMenuItem> | null,
): Partial<RegisterMenuRequestDto> {
  return {
    unit: menu?.unit === MENU_UNIT.MILLILITER ? MENU_UNIT.MILLILITER : MENU_UNIT.GRAM,
    weight: toFiniteNumberOrUndefined(menu?.weight),
    calories: toFiniteNumberOrUndefined(menu?.calories),
    ...buildNutrientFormFields(menu ?? {}),
  };
}

const RESET_NUTRIENT_FIELDS = buildNutrientResetPatch();

export default function NutrientModifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const locationState = (location.state ?? {}) as NutrientModifyLocationState;
  const menuInState = locationState.menu;
  const menuId = getSafeMenuId(searchParams.get("menuId"));
  const menuSelectionFlowId = getMenuSelectionFlowIdFromSearchParams(searchParams);
  const menuSelectionFlow = useMenuSelectionFlowById(menuSelectionFlowId);
  const dateKey = getSafeDateKey(
    searchParams.get("date") ?? menuSelectionFlow?.relatedMealRecordDateKey ?? null,
  );
  const mealType = getMealType(
    searchParams.get("mealType") ?? menuSelectionFlow?.relatedMealRecordMealType ?? null,
  );

  const {
    data: fetchedMenu,
    isPending: isMenuPending,
    isError: isMenuError,
  } = useMealDetailQuery(menuId);

  const resolvedMenu = useMemo<MealMenuItem | null>(() => {
    if (menuInState && fetchedMenu) {
      return { ...fetchedMenu, ...menuInState };
    }

    return (menuInState ?? fetchedMenu ?? null) as MealMenuItem | null;
  }, [fetchedMenu, menuInState]);
  const baseFormState = useMemo(() => buildInitialFormState(resolvedMenu), [resolvedMenu]);
  const [editedFormState, setEditedFormState] = useState<Partial<RegisterMenuRequestDto>>({});
  const formState = useMemo(
    () => ({
      ...baseFormState,
      ...editedFormState,
    }),
    [baseFormState, editedFormState],
  );

  useEffect(() => {
    if (menuId !== null) {
      return;
    }

    toast.warning("수정할 메뉴 정보를 찾지 못했어요");
    navigate(-1);
  }, [menuId, navigate]);

  useEffect(() => {
    if (!isMenuError) {
      return;
    }

    toast.warning("메뉴 정보를 불러오지 못했어요");
    navigate(-1);
  }, [isMenuError, navigate]);

  const foodName = (resolvedMenu?.name ?? "").trim();
  const brandName = (resolvedMenu?.brand ?? "").trim();
  const dataSource = resolvedMenu?.data_source ?? MENU_DATA_SOURCE.PERSONAL;
  const isPersonalData = dataSource === MENU_DATA_SOURCE.PERSONAL;
  const unit: MenuUnit =
    formState.unit === MENU_UNIT.MILLILITER ? MENU_UNIT.MILLILITER : MENU_UNIT.GRAM;
  const initialUnit: MenuUnit =
    baseFormState.unit === MENU_UNIT.MILLILITER ? MENU_UNIT.MILLILITER : MENU_UNIT.GRAM;

  const hasFormChanges = useMemo(() => {
    if (unit !== initialUnit) {
      return true;
    }

    if (toNullableFiniteNumber(formState.weight) !== toNullableFiniteNumber(baseFormState.weight)) {
      return true;
    }

    if (
      toNullableFiniteNumber(formState.calories) !== toNullableFiniteNumber(baseFormState.calories)
    ) {
      return true;
    }

    return MENU_NUTRIENT_FIELD_KEYS.some(
      (key) =>
        toNullableFiniteNumber(formState[key]) !== toNullableFiniteNumber(baseFormState[key]),
    );
  }, [baseFormState, formState, initialUnit, unit]);

  const nutrientForm: Partial<MenuNutrientFields> = buildNutrientFormFields(formState);

  const { mutate: modifyMenu, isPending: isModifyPending } = useModifyNutrientMutation();
  const { mutate: createMenuFromPublic, isPending: isCreatePending } = useRegisterMenuMutation();
  const isSubmitting = isModifyPending || isCreatePending;

  const isSubmitDisabled =
    isSubmitting ||
    isMenuPending ||
    menuId === null ||
    !hasFormChanges ||
    foodName.length === 0 ||
    formState.weight === undefined ||
    formState.calories === undefined;

  const handleFieldChange = (key: keyof MenuNutrientFields, nextValue: string) => {
    const parsedValue = nextValue === "" ? undefined : Number(nextValue);

    setEditedFormState((prev) => ({
      ...prev,
      [key]: parsedValue !== undefined && Number.isFinite(parsedValue) ? parsedValue : undefined,
    }));
  };

  const getBackFallbackPath = () => {
    if (menuId !== null) {
      return getMenuDetailPathByMode(menuId);
    }

    if (menuSelectionFlowId) {
      return getMenuSelectionFlowSearchPath(menuSelectionFlowId);
    }

    return getMealRecordPath(dateKey, mealType);
  };

  const getMenuDetailPathByMode = (targetMenuId: number) => {
    if (menuSelectionFlowId) {
      return getMenuSelectionFlowMenuDetailPath({
        menuSelectionFlowId,
        menuId: targetMenuId,
      });
    }

    return getMealDetailPath(dateKey, mealType, targetMenuId);
  };

  const handleBack = () => {
    navigateBack({ fallbackTo: getBackFallbackPath() });
  };

  const handleResetForm = () => {
    setEditedFormState((prev) => ({
      ...prev,
      weight: undefined,
      calories: undefined,
      ...RESET_NUTRIENT_FIELDS,
    }));
  };

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      toast.warning("수정할 내용이 없어요");
      return;
    }

    if (formState.weight === 0 || formState.weight === undefined) {
      toast.warning("중량을 다시 확인해주세요");
      return;
    }

    const payload: RegisterManualMenuPayload = {
      name: foodName,
      brand: brandName,
      unit,
      weight: formState.weight,
      calories: formState.calories ?? 0,
      ...buildNullableNutrientFields(formState),
    };

    if (isPersonalData) {
      if (menuId === null) {
        toast.error("수정할 메뉴 정보를 찾지 못했어요");
        navigate(PATH.HOME, { replace: true });
        return;
      }

      modifyMenu(
        { id: menuId, ...payload },
        {
          onSuccess: () => {
            toast.success("영양 성분을 수정했어요");
            navigateBackAndPush({
              count: 2,
              animate: false,
              to: getMenuDetailPathByMode(menuId),
            });
          },
          onError: () => {
            toast.warning("영양 성분 수정에 실패했어요");
          },
        },
      );
      return;
    }

    createMenuFromPublic(payload, {
      onSuccess: (createdMenuId) => {
        if (!Number.isInteger(createdMenuId) || createdMenuId <= 0) {
          toast.warning("등록된 메뉴 정보를 불러오지 못했어요");
          navigate(PATH.HOME, { replace: true });
          return;
        }

        toast.success("개인 메뉴로 등록했어요");
        const detailPath = getMenuDetailPathByMode(createdMenuId);

        navigateBackAndPush({
          count: 2,
          animate: false,
          to: detailPath,
        });
      },
      onError: () => {
        toast.warning("공용 데이터를 개인 데이터 등록하는데 실패했어요");
      },
    });
  };

  return (
    <section className={styles.page}>
      <PageHeader title="영양성분 수정" onBack={handleBack} />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.topSection}>
            <p className={`typo-title1 ${styles.textNormal}`}>
              {foodName || "메뉴 정보를 확인해주세요"}
            </p>
            {brandName && <p className={`typo-label4 textAssistive`}>{brandName}</p>}
          </section>

          <section className={styles.nutrientSection}>
            <div className={styles.nutrientHeader}>
              <p className={`typo-title3 ${styles.textNormal}`}>영양정보</p>
              <Button
                variant="text"
                interaction="normal"
                size="small"
                color="normal"
                onClick={handleResetForm}
              >
                전체 삭제
              </Button>
            </div>

            <div className="divider dividerMargin20" />

            <section className={styles.nutrientFormWrap}>
              <NutrientDetailForm
                totalWeight={formState.weight}
                onTotalWeightChange={(nextWeight) => {
                  setEditedFormState((prev) => ({
                    ...prev,
                    weight: nextWeight,
                  }));
                }}
                totalCalories={formState.calories}
                onTotalCaloriesChange={(nextCalories) => {
                  setEditedFormState((prev) => ({
                    ...prev,
                    calories: nextCalories,
                  }));
                }}
                form={nutrientForm}
                onFieldChange={handleFieldChange}
                weightUnit={unit}
                onWeightUnitChange={(nextUnit) => {
                  setEditedFormState((prev) => ({
                    ...prev,
                    unit: nextUnit,
                  }));
                }}
              />
            </section>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={handleSubmit}
          interaction={isSubmitDisabled ? "disable" : "normal"}
          disabled={isSubmitDisabled}
        >
          수정하기
        </Button>
      </footer>

      {isSubmitting ? <LoadingOverlay label="영양성분을 저장하는 중입니다." /> : null}
    </section>
  );
}
