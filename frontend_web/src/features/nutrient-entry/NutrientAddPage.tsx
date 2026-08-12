import { type ChangeEvent, useEffect, useState } from "react";

import {
  getMealType,
  getSafeDateKey,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  buildMenuSelectionPathContext,
  getMenuSelectionPath,
  getMenuSelectionRouteContextFromSearchParams,
  getMenuSelectionSearchPath,
  type MenuSelectionPathParams,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
import {
  createBrandSearchSelectionKey,
  useBrandSearchSelectedBrand,
  useClearBrandSearchSelection,
} from "@/features/search/brand/stores/brandSearchSelection.store";
import { PATH } from "@/router/path";
import { getPathWithMeal } from "@/router/pathHelpers";
import type { MealType, RegisterMenuRequestDto } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import {
  navigateBack,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/NutrientAddPage.module.css";

type NutrientAddLocationState = Omit<Partial<RegisterMenuRequestDto>, "unit"> & {
  dateKey?: string;
  mealType?: MealType;
  brandName?: string;
  chatId?: number;
  brandSearchReturnKey?: string;
  unit?: number;
};

export type NutrientAddSubmitPayload = {
  brand: string;
  name: string;
};

type NutrientAddFormPageProps = {
  appendMealQueryToBrandSearchReturn?: boolean;
  backFallbackPath: string;
  brandSearchReturnPath?: string;
  dateKey: string;
  initialState: NutrientAddLocationState;
  isSubmitPending?: boolean;
  mealType: MealType;
  menuSelectionContext?: MenuSelectionPathParams | null;
  nextLabel?: string;
  onNext: (payload: NutrientAddSubmitPayload) => void;
  title?: string;
};

export default function NutrientAddPage() {
  const navigation = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as NutrientAddLocationState;
  const menuSelectionRouteContext = getMenuSelectionRouteContextFromSearchParams(searchParams);
  const dateKey = getSafeDateKey(searchParams.get("date") ?? locationState.dateKey ?? null);
  const mealType = getMealType(
    searchParams.get("mealType") ?? locationState.mealType ?? null,
  );
  const menuSelectionContext: MenuSelectionPathParams | null = menuSelectionRouteContext.target
    ? buildMenuSelectionPathContext({
        dateKey,
        mealType,
        routeContext: menuSelectionRouteContext,
        target: menuSelectionRouteContext.target,
      })
    : null;

  const handleNext = ({ brand, name }: NutrientAddSubmitPayload) => {
    const params = new URLSearchParams({
      date: dateKey,
      mealType,
      name,
    });

    if (brand.trim()) {
      params.set("brand", brand.trim());
    }

    const nutrientCameraPath = menuSelectionContext?.target
      ? getMenuSelectionPath({
          path: PATH.NUTRIENT_CAMERA,
          ...menuSelectionContext,
          extraSearchParams: {
            name,
            brand: brand.trim() || undefined,
          },
        })
      : PATH.NUTRIENT_CAMERA + "?" + params.toString();

    navigation(nutrientCameraPath, {
      state: {
        name,
        brand,
        dateKey,
        mealType,
      },
    });
  };

  return (
    <NutrientAddFormPage
      backFallbackPath={
        menuSelectionContext?.target
          ? getMenuSelectionSearchPath(menuSelectionContext)
          : getPathWithMeal(PATH.MEAL_RECORD_ADD_SEARCH, dateKey, mealType)
      }
      brandSearchReturnPath={PATH.NUTRIENT_ADD}
      dateKey={dateKey}
      initialState={locationState}
      mealType={mealType}
      menuSelectionContext={menuSelectionContext}
      onNext={handleNext}
    />
  );
}

export function NutrientAddFormPage({
  appendMealQueryToBrandSearchReturn = true,
  backFallbackPath,
  brandSearchReturnPath = PATH.NUTRIENT_ADD,
  dateKey,
  initialState,
  isSubmitPending = false,
  mealType,
  menuSelectionContext = null,
  nextLabel = "다음",
  onNext,
  title = "영양성분 등록",
}: NutrientAddFormPageProps) {
  const navigation = useNavigate();
  const [foodName, setFoodName] = useState(initialState.name ?? "");
  const [brandSearchReturnKey] = useState(
    initialState.brandSearchReturnKey ?? createBrandSearchSelectionKey(),
  );
  const selectedBrandName = useBrandSearchSelectedBrand(brandSearchReturnKey);
  const clearBrandSearchSelection = useClearBrandSearchSelection();
  const brandName = (
    selectedBrandName ??
    initialState.brand ??
    initialState.brandName ??
    ""
  ).trim();

  useEffect(() => {
    return () => {
      clearBrandSearchSelection(brandSearchReturnKey);
    };
  }, [brandSearchReturnKey, clearBrandSearchSelection]);

  const handleFoodNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFoodName(event.target.value.slice(0, 300));
  };

  const handleOpenBrandSearch = () => {
    const brandSearchPath = menuSelectionContext?.target
      ? getMenuSelectionPath({
          path: PATH.BRAND_SEARCH,
          ...menuSelectionContext,
        })
      : PATH.BRAND_SEARCH;
    const returnPath = menuSelectionContext?.target
      ? getMenuSelectionPath({
          path: brandSearchReturnPath,
          ...menuSelectionContext,
        })
      : appendMealQueryToBrandSearchReturn
        ? getPathWithMeal(brandSearchReturnPath, dateKey, mealType)
        : brandSearchReturnPath;

    navigation(brandSearchPath, {
      state: {
        name: foodName,
        brand: brandName,
        dateKey,
        mealType,
        brandSearchReturnKey,
        returnPath,
      },
    });
  };

  const isNextDisabled = isSubmitPending || !foodName.trim();

  const handleNext = () => {
    if (isNextDisabled) {
      return;
    }

    onNext({
      brand: brandName.trim(),
      name: foodName.trim().slice(0, 300),
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
          <div className={styles.fieldWrap}>
            <div className={styles.labelRow}>
              <p className={`typo-title3 ${styles.labelText}`}>음식명</p>
              <p className={`typo-label6 ${styles.requiredText}`}>* 필수로 작성해주세요</p>
            </div>

            <input
              className={`typo-body3 ${styles.textInput}`}
              type="text"
              maxLength={300}
              value={foodName}
              onChange={handleFoodNameChange}
              placeholder="음식명 입력"
              aria-label="음식명 입력"
            />

            <p className={`typo-body3 ${styles.limitText}`}>최대 300자 이내</p>
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
        </div>
      </main>

      <footer className={styles.footer}>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={handleNext}
          interaction={isNextDisabled ? "disable" : "normal"}
          disabled={isNextDisabled}
        >
          {nextLabel}
        </Button>
      </footer>
    </section>
  );
}
