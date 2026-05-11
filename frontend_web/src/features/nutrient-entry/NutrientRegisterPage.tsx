import { Search } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";

import {
  getMealType,
  getSafeDateKey,
  getSafeKeyword,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import { type RegisterManualMenuPayload } from "@/features/nutrient-entry/api/nutrient";
import { NutrientDetailForm } from "@/features/nutrient-entry/components/NutrientDetailForm";
import { useRegisterMenuMutation } from "@/features/nutrient-entry/hooks/mutations/useNutrientMutation";
import {
  buildNullableNutrientFields,
  buildNutrientFormFields,
  hasChildNutrientOverflow,
} from "@/features/nutrient-entry/utils/nutrientFields";
import {
  createBrandSearchSelectionKey,
  useBrandSearchSelectedBrand,
  useClearBrandSearchSelection,
} from "@/features/search/brand/stores/brandSearchSelection.store";
import { PATH } from "@/router/path";
import { getMealDetailPath, getMealSearchPath, getPathWithMeal } from "@/router/pathHelpers";
import type {
  MealType,
  MenuNutrientFields,
  MenuUnit,
  RegisterMenuRequestDto,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBackOrFallback } from "@/shared/navigation/backNavigation";
import { useLocation, useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/NutrientRegisterPage.module.css";

type NutrientRegisterLocationState = Partial<RegisterMenuRequestDto> & {
  brandName?: string;
  dateKey?: string;
  mealType?: MealType;
  keyword?: string;
  entrySource?: "camera" | "manual";
  brandSearchReturnKey?: string;
};

export default function NutrientRegisterPage() {
  const navigation = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as NutrientRegisterLocationState;
  const dateKey = getSafeDateKey(searchParams.get("date") ?? locationState.dateKey ?? null);
  const mealType = getMealType(searchParams.get("mealType") ?? locationState.mealType ?? null);
  const searchKeyword = getSafeKeyword(
    searchParams.get("keyword") ?? locationState.keyword ?? null,
  );

  const [formState, setFormState] = useState<Partial<RegisterMenuRequestDto>>(() => ({
    ...locationState,
    name: (locationState.name ?? "").trim(),
    brand: (locationState.brand ?? locationState.brandName ?? "").trim(),
  }));
  const [brandSearchReturnKey] = useState(
    locationState.brandSearchReturnKey ?? createBrandSearchSelectionKey(),
  );
  const selectedBrandName = useBrandSearchSelectedBrand(brandSearchReturnKey);
  const clearBrandSearchSelection = useClearBrandSearchSelection();
  const { mutate: registerManualMenu, isPending: isSubmitting } = useRegisterMenuMutation();
  const isCameraEntry = locationState.entrySource === "camera";

  const brandName = (selectedBrandName ?? formState.brand ?? "").trim();
  const nutrientForm = buildNutrientFormFields(formState);

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
      name: event.target.value,
    }));
  };

  const handleOpenBrandSearch = () => {
    navigation(PATH.BRAND_SEARCH, {
      state: {
        ...formState,
        brand: brandName,
        dateKey,
        mealType,
        keyword: searchKeyword,
        brandSearchReturnKey,
        returnPath: getPathWithMeal(PATH.NUTRIENT_ADD_REGISTER, dateKey, mealType, searchKeyword),
      },
    });
  };

  const isSubmitDisabled =
    isSubmitting ||
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

    if (hasChildNutrientOverflow(formState)) {
      toast.warning("하위 항목 합이 상위 항목을 초과했어요");
      return;
    }

    const name = (formState.name ?? "").trim();
    const brand = brandName;
    const weight = formState.weight ?? 0;
    const calories = formState.calories ?? 0;
    const unit: MenuUnit = formState.unit === 1 ? 1 : 0;

    const payload: RegisterManualMenuPayload = {
      name,
      brand,
      unit,
      weight,
      calories,
      ...buildNullableNutrientFields(formState),
    };

    registerManualMenu(payload, {
      onSuccess: (savedMenuId) => {
        const returnPath = getMealDetailPath(
          dateKey,
          mealType,
          savedMenuId,
          "MEAL_SEARCH",
          searchKeyword,
        );
        toast.success("메뉴가 등록되었어요");
        navigation(returnPath, { replace: true });
      },
      onError: () => {
        toast.warning("등록에 실패했어요");
      },
    });
  };

  const handleBack = () => {
    navigateBackOrFallback(navigation, getMealSearchPath(dateKey, mealType, searchKeyword));
  };

  return (
    <section className={styles.page}>
      <PageHeader title="영양성분 등록" onBack={() => handleBack()} />

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
                    <p className={`typo-label6 ${styles.requiredText}`}>* 필수로 작성해주세요</p>
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
                    <Search size={20} className={styles.brandSearchIcon} />
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
          등록하기
        </Button>
      </footer>
    </section>
  );
}
