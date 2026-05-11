import { Search } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";

import {
  getMealType,
  getSafeDateKey,
  getSafeKeyword,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  createBrandSearchSelectionKey,
  useBrandSearchSelectedBrand,
  useClearBrandSearchSelection,
} from "@/features/search/brand/stores/brandSearchSelection.store";
import { PATH } from "@/router/path";
import { getMealSearchPath } from "@/router/pathHelpers";
import { getPathWithMeal } from "@/router/pathHelpers";
import type { MealType, RegisterMenuRequestDto } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { navigateBackOrFallback } from "@/shared/navigation/backNavigation";
import { useLocation, useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/NutrientAddPage.module.css";

type NutrientAddLocationState = Partial<RegisterMenuRequestDto> & {
  dateKey?: string;
  mealType?: MealType;
  brandName?: string;
  returnPath?: string;
  keyword?: string;
  brandSearchReturnKey?: string;
};

export default function NutrientAddPage() {
  const navigation = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as NutrientAddLocationState;

  const dateKey = getSafeDateKey(searchParams.get("date") ?? locationState.dateKey ?? null);
  const mealType = getMealType(searchParams.get("mealType") ?? locationState.mealType ?? null);
  const searchKeyword = getSafeKeyword(searchParams.get("keyword") ?? locationState.keyword ?? null);
  const [foodName, setFoodName] = useState(locationState.name ?? "");
  const [brandSearchReturnKey] = useState(
    locationState.brandSearchReturnKey ?? createBrandSearchSelectionKey(),
  );
  const selectedBrandName = useBrandSearchSelectedBrand(brandSearchReturnKey);
  const clearBrandSearchSelection = useClearBrandSearchSelection();
  const brandName = (selectedBrandName ?? locationState.brand ?? locationState.brandName ?? "").trim();

  useEffect(() => {
    return () => {
      clearBrandSearchSelection(brandSearchReturnKey);
    };
  }, [brandSearchReturnKey, clearBrandSearchSelection]);

  const handleFoodNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFoodName(event.target.value);
  };

  const handleOpenBrandSearch = () => {
    navigation(PATH.BRAND_SEARCH, {
      state: {
        ...locationState,
        name: foodName,
        brand: brandName,
        dateKey,
        mealType,
        keyword: searchKeyword,
        brandSearchReturnKey,
        returnPath: getPathWithMeal(PATH.NUTRIENT_ADD, dateKey, mealType, searchKeyword),
      },
    });
  };

  const isNextDisabled = !foodName.trim();

  const handleNext = () => {
    if (isNextDisabled) {
      return;
    }

    const params = new URLSearchParams({
      date: dateKey,
      mealType,
      name: foodName.trim(),
    });

    if (brandName.trim()) {
      params.set("brand", brandName.trim());
    }
    if (searchKeyword.length > 0) {
      params.set("keyword", searchKeyword);
    }

    navigation(PATH.NUTRIENT_CAMERA + "?" + params.toString());
  };

  const handleBack = () => {
    navigateBackOrFallback(navigation, getMealSearchPath(dateKey, mealType, searchKeyword));
  };

  return (
    <section className={styles.page}>
      <PageHeader title="영양성분 등록" onBack={handleBack} />

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

            <p className={`typo-label4 ${styles.limitText}`}>최대 300자 이내</p>
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
          다음
        </Button>
      </footer>
    </section>
  );
}
