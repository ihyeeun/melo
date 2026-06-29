import { type ChangeEvent, useEffect, useState } from "react";

import { type RegisterManualMenuPayload } from "@/features/nutrient-entry/api/nutrient";
import { NutrientDetailForm } from "@/features/nutrient-entry/components/NutrientDetailForm";
import { useRegisterMenuMutation } from "@/features/nutrient-entry/hooks/mutations/useNutrientMutation";
import styles from "@/features/nutrient-entry/styles/NutrientRegisterPage.module.css";
import {
  buildNullableNutrientFields,
  buildNutrientFormFields,
} from "@/features/nutrient-entry/utils/nutrientFields";
import {
  createBrandSearchSelectionKey,
  useBrandSearchSelectedBrand,
  useClearBrandSearchSelection,
} from "@/features/search/brand/stores/brandSearchSelection.store";
import { PATH } from "@/router/path";
import { getPathWithMeal } from "@/router/pathHelpers";
import type {
  MealType,
  MenuNutrientFields,
  MenuUnit,
  RegisterMenuRequestDto,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";

export type NutrientRegisterEntrySource = "camera" | "manual" | "chatNutritionLabel";

export type NutrientRegisterFormState = Partial<RegisterMenuRequestDto> & {
  brandName?: string;
  chatId?: number;
  dateKey?: string;
  mealType?: MealType;
  keyword?: string;
  entrySource?: NutrientRegisterEntrySource;
  brandSearchReturnKey?: string;
};

type NutrientRegisterFormPageProps = {
  appendMealQueryToBrandSearchReturn?: boolean;
  backFallbackPath: string;
  brandSearchReturnPath?: string;
  dateKey: string;
  initialState: NutrientRegisterFormState;
  isSubmitPending?: boolean;
  keyword?: string;
  mealType: MealType;
  onRegisteredMenu?: (savedMenuId: number) => void;
  onSubmit?: (payload: NutrientRegisterSubmitPayload) => void | Promise<void>;
  submitLabel?: string;
  title?: string;
};

export type NutrientRegisterSubmitPayload = Pick<
  RegisterMenuRequestDto,
  "name" | "brand" | "unit" | "weight" | "calories"
> &
  Partial<MenuNutrientFields>;

export function NutrientRegisterFormPage({
  appendMealQueryToBrandSearchReturn = true,
  backFallbackPath,
  brandSearchReturnPath = PATH.NUTRIENT_ADD_REGISTER,
  dateKey,
  initialState,
  isSubmitPending = false,
  keyword = "",
  mealType,
  onRegisteredMenu,
  onSubmit,
  submitLabel = "등록하기",
  title = "영양성분 등록",
}: NutrientRegisterFormPageProps) {
  const navigation = useNavigate();
  const [formState, setFormState] = useState<NutrientRegisterFormState>(() => ({
    ...initialState,
    name: (initialState.name ?? "").trim(),
    brand: (initialState.brand ?? initialState.brandName ?? "").trim(),
  }));
  const [brandSearchReturnKey] = useState(
    initialState.brandSearchReturnKey ?? createBrandSearchSelectionKey(),
  );
  const selectedBrandName = useBrandSearchSelectedBrand(brandSearchReturnKey);
  const clearBrandSearchSelection = useClearBrandSearchSelection();
  const { mutate: registerManualMenu, isPending: isSubmitting } = useRegisterMenuMutation();
  const isCameraEntry = initialState.entrySource === "camera";

  const brandName = (selectedBrandName ?? formState.brand ?? "").trim();
  const nutrientForm = buildNutrientFormFields(formState);
  const isSubmitInProgress = isSubmitting || isSubmitPending;

  useEffect(() => {
    return () => {
      clearBrandSearchSelection(brandSearchReturnKey);
    };
  }, [brandSearchReturnKey, clearBrandSearchSelection]);

  const handleFieldChange = (key: keyof MenuNutrientFields, nextValue: string) => {
    const parsedValue = nextValue === "" ? undefined : Number(nextValue);

    setFormState((prev) => ({
      ...prev,
      [key]: parsedValue !== undefined && Number.isFinite(parsedValue) ? parsedValue : undefined,
    }));
  };

  const handleFoodNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      name: event.target.value.slice(0, 300),
    }));
  };

  const handleOpenBrandSearch = () => {
    navigation(PATH.BRAND_SEARCH, {
      state: {
        ...formState,
        brand: brandName,
        dateKey,
        mealType,
        keyword,
        brandSearchReturnKey,
        returnPath: appendMealQueryToBrandSearchReturn
          ? getPathWithMeal(brandSearchReturnPath, dateKey, mealType, keyword)
          : brandSearchReturnPath,
      },
    });
  };

  const isSubmitDisabled =
    isSubmitInProgress ||
    (formState.name ?? "").trim().length === 0 ||
    formState.weight === undefined ||
    formState.calories === undefined;

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }

    if (formState.weight === 0) {
      toast.warning("중량을 다시 확인해주세요");
      return;
    }

    const name = (formState.name ?? "").trim();
    const brand = brandName;
    const weight = formState.weight ?? 0;
    const calories = formState.calories ?? 0;
    const unit: MenuUnit = formState.unit === 1 ? 1 : 0;

    const submitPayload: NutrientRegisterSubmitPayload = {
      name,
      brand,
      unit,
      weight,
      calories,
      ...buildNutrientFormFields(formState),
    };

    if (onSubmit) {
      void onSubmit(submitPayload);
      return;
    }

    const payload: RegisterManualMenuPayload = {
      ...submitPayload,
      ...buildNullableNutrientFields(formState),
    };

    registerManualMenu(payload, {
      onSuccess: (savedMenuId) => {
        toast.success("메뉴가 등록되었어요");
        onRegisteredMenu?.(savedMenuId);
      },
      onError: () => {
        toast.warning("등록에 실패했어요");
      },
    });
  };

  const handleBack = () => {
    navigateBack({ fallbackTo: backFallbackPath });
  };

  return (
    <section className={styles.page}>
      <PageHeader title={title} onBack={handleBack} />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.topSection}>
            {isCameraEntry ? (
              <p className={`typo-title3 ${styles.recognizedInfoText}`}>사진에서 인식한 영양정보</p>
            ) : (
              <>
                <div className={styles.fieldWrap}>
                  <div className={styles.labelRow}>
                    <p className={`typo-title3 ${styles.labelText}`}>음식명</p>
                    <p className={`typo-body3 ${styles.requiredText}`}>* 필수로 작성해주세요</p>
                  </div>

                  <input
                    className={`typo-body3 ${styles.textInput}`}
                    type="text"
                    value={formState.name ?? ""}
                    onChange={handleFoodNameChange}
                    placeholder="음식명 입력"
                    aria-label="음식명 입력"
                  />
                </div>

                <div className={styles.fieldWrap}>
                  <p className={`typo-title3 ${styles.labelText}`}>브랜드명</p>
                  <button
                    type="button"
                    className={styles.brandButton}
                    onClick={handleOpenBrandSearch}
                    aria-label="브랜드명 검색 열기"
                  >
                    <span
                      className={`typo-body3 ${brandName ? styles.brandValue : styles.brandPlaceholder}`}
                    >
                      {brandName || "브랜드명 입력"}
                    </span>
                    <SystemIcon name="search" size={20} className={styles.brandSearchIcon} />
                  </button>
                </div>

                <div className={styles.nutrientHeader}>
                  <p className={`typo-title3 ${styles.labelText}`}>영양정보</p>
                </div>
              </>
            )}
            <div className="divider" />
          </section>

          <section className={styles.nutrientSection}>
            <section className={styles.nutrientFormWrap}>
              <NutrientDetailForm
                totalWeight={formState.weight}
                onTotalWeightChange={(nextWeight) => {
                  setFormState((prev) => ({
                    ...prev,
                    weight: nextWeight,
                  }));
                }}
                totalCalories={formState.calories}
                onTotalCaloriesChange={(nextCalories) => {
                  setFormState((prev) => ({
                    ...prev,
                    calories: nextCalories,
                  }));
                }}
                form={nutrientForm}
                onFieldChange={handleFieldChange}
                weightUnit={formState.unit ?? (0 as MenuUnit)}
                onWeightUnitChange={(nextUnit) => {
                  setFormState((prev) => ({
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
          {submitLabel}
        </Button>
      </footer>

      {isSubmitting ? <LoadingOverlay label="영양성분을 등록하는 중입니다." /> : null}
    </section>
  );
}
