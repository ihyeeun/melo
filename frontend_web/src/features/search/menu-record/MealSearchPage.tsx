import { useActivity, useEnterDoneEffect } from "@stackflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MAX_MEAL_RECORD_MENUS } from "@/features/meal-record/constants/menu.constants";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftSelectedCount,
  useMenuDraftStore,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import {
  getMealType,
  getSafeDateKey,
  getSafeKeyword,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import RegisterBottomSheet from "@/features/search/components/RegisterBottomSheet";
import { useMealSearchMutation } from "@/features/search/menu-record/hooks/useMealSearchMutation";
import { PATH } from "@/router/path";
import { getMealDetailPath, getMealRecordPath } from "@/router/pathHelpers";
import { getPathWithMeal } from "@/router/pathHelpers";
import { type MenuSimpleResponseDto } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { toast } from "@/shared/commons/toast/toast";
import { FEATURE_GUARD, isFeatureBlocked } from "@/shared/guards/featureGuard";
import { navigateBack, useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

import styles from "../styles/MealSearch.module.css";

function getDefaultConsumedWeight(weight: number) {
  return typeof weight === "number" && Number.isFinite(weight) && weight > 0 ? weight : 1;
}

export default function MealSearchPage() {
  const navigate = useNavigate();
  const { isTop } = useActivity();
  const [searchParams] = useSearchParams();

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const initialKeyword = getSafeKeyword(searchParams.get("keyword"));
  const [submittedKeyword, setSubmittedKeyword] = useState(initialKeyword);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const selectedMenus = useMenuDraftMenus(dateKey, mealType);
  const selectedCount = useMenuDraftSelectedCount(dateKey, mealType);
  const draft = useMenuDraftStore((store) => store.drafts[draftKey]);
  const hasDraft = Boolean(draft);
  const showFoodCameraButton = !isFeatureBlocked(FEATURE_GUARD.FOOD_CAMERA);

  const selectedMenuIdSet = useMemo(
    () => new Set(selectedMenus.map((menu) => menu.id)),
    [selectedMenus],
  );

  const { mutate: mealSearchMutation, data: searchResults } = useMealSearchMutation();

  useEffect(() => {
    if (!isTop || hasDraft) {
      return;
    }

    toast.warning("올바르지 않은 접근이에요");
    navigate(getMealRecordPath(dateKey, mealType), { replace: true });
  }, [dateKey, hasDraft, isTop, mealType, navigate]);

  useEnterDoneEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const handleToggleMenuSelection = (menu: MenuSimpleResponseDto) => {
    const menuId = menu.id;

    if (selectedMenuIdSet.has(menuId)) {
      removeMenu({ key: draftKey, id: menuId });
      return;
    }

    if (selectedCount + 1 > MAX_MEAL_RECORD_MENUS) {
      toast.warning("최대 100개까지 기록할 수 있어요");
      return;
    }

    upsertMenu({
      key: draftKey,
      id: menuId,
      quantity: getDefaultConsumedWeight(menu.weight),
    });

    upsertPreviews({
      key: draftKey,
      previews: [
        {
          id: menu.id,
          name: menu.name,
          brand: menu.brand,
          unit_quantity: menu.unit_quantity,
          calories: menu.calories,
          weight: menu.weight,
          unit: menu.unit,
          data_source: menu.data_source,
        },
      ],
    });
  };

  const handleMenuDetailPageOpen = (menuId: number) => {
    navigate(getMealDetailPath(dateKey, mealType, menuId, "MEAL_SEARCH", submittedKeyword));
  };

  const handleApplySelectedMenus = () => {
    if (selectedMenus.length === 0) return;

    navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) });
  };

  const handleClearKeyword = () => {
    setSubmittedKeyword("");
    searchInputRef.current?.focus();
  };

  const [isDirectInputSheetOpen, setIsDirectInputSheetOpen] = useState(false);
  const handleCloseDirectInputSheet = () => {
    setIsDirectInputSheetOpen(false);
  };
  const handleNavigateNutrientAdd = () => {
    setIsDirectInputSheetOpen(false);
    navigate(getPathWithMeal(PATH.NUTRIENT_ADD_REGISTER, dateKey, mealType, submittedKeyword));
  };

  const handleNavigateNutrientCamera = () => {
    setIsDirectInputSheetOpen(false);

    navigate(getPathWithMeal(PATH.NUTRIENT_ADD, dateKey, mealType, submittedKeyword));
  };

  const handleCameraClick = () => {
    if (selectedCount >= MAX_MEAL_RECORD_MENUS) {
      toast.warning(
        `최대 ${MAX_MEAL_RECORD_MENUS}개까지 기록할 수 있어요`,
        "기존 메뉴를 일부 삭제한 뒤 다시 시도해주세요.",
      );
      return;
    }

    navigate(getPathWithMeal(PATH.FOOD_CAMERA, dateKey, mealType));
  };

  const handleMealSearch = () => {
    if (submittedKeyword.trim() === "") return;

    mealSearchMutation(submittedKeyword);
  };

  if (!hasDraft) {
    return null;
  }

  return (
    <section className={styles.page}>
      <SearchInputHeader
        value={submittedKeyword}
        onValueChange={setSubmittedKeyword}
        onClear={handleClearKeyword}
        onEnter={handleMealSearch}
        inputRef={searchInputRef}
        placeholder="메뉴를 검색해보세요"
        inputAriaLabel="메뉴 검색"
        onBack={() => navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) })}
      />

      <main className={styles.main}>
        <section className={styles.content}>
          {searchResults ? (
            <>
              {searchResults.has_result ? (
                <div className={styles.resultList}>
                  {searchResults.menu_list.map((menu) => {
                    const isSelected = selectedMenuIdSet.has(menu.id);

                    return (
                      <MealMenuCard
                        key={menu.id}
                        name={menu.name}
                        calories={menu.calories}
                        unit_quantity={menu.unit_quantity}
                        brand={menu.brand}
                        data_source={menu.data_source}
                        weight={menu.weight}
                        unit={menu.unit}
                        icon={isSelected ? "check" : "add"}
                        state={isSelected ? "select" : "default"}
                        onClick={() => handleMenuDetailPageOpen(menu.id)}
                        onIconClick={() => handleToggleMenuSelection(menu)}
                      />
                    );
                  })}

                  <div className={styles.bottomTextContainer}>
                    <Button
                      variant="text"
                      interaction="normal"
                      size="small"
                      color="normal"
                      onClick={() => {
                        setIsDirectInputSheetOpen(true);
                      }}
                    >
                      <span className={styles.bottomText}>찾으시는 메뉴가 없나요?</span>
                      직접 등록하기
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyResultContainer}>
                  <section className={styles.emptyResult}>
                    <p className="typo-label4">
                      일치하는 메뉴나 브랜드가 없어요
                      <br />
                      비슷한 항목을 선택하거나 직접 등록할 수 있어요
                    </p>
                    <div className={styles.buttonContainer}>
                      <Button
                        variant="text"
                        interaction="normal"
                        size="small"
                        color="normal"
                        onClick={() => {
                          setIsDirectInputSheetOpen(true);
                        }}
                      >
                        영양 성분 직접 등록
                      </Button>
                    </div>
                  </section>

                  {(searchResults.menu_list.length >= 0 ||
                    searchResults.brand_list.length >= 0) && (
                    <section className={styles.similarSection}>
                      <p className={`${styles.similarSectionTitle} typo-title3`}>
                        비슷한 메뉴는 어때요?
                      </p>

                      <div className={styles.resultList}>
                        {searchResults.menu_list.map((menu) => {
                          const isSelected = selectedMenuIdSet.has(menu.id);

                          return (
                            <MealMenuCard
                              key={menu.id}
                              name={menu.name}
                              calories={menu.calories}
                              unit_quantity={menu.unit_quantity}
                              weight={menu.weight}
                              unit={menu.unit}
                              brand={menu.brand}
                              data_source={menu.data_source}
                              icon={isSelected ? "check" : "add"}
                              state={isSelected ? "select" : "default"}
                              onClick={() => handleMenuDetailPageOpen(menu.id)}
                              onIconClick={() => handleToggleMenuSelection(menu)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.placeholder}>
              <p className={`typo-title4 ${styles.placeholderText}`}>
                메뉴를 검색하거나
                <br />
                음식 사진을 찍어 기록해보세요
              </p>

              <Button
                variant="text"
                interaction="normal"
                size="small"
                color="normal"
                onClick={() => {
                  setIsDirectInputSheetOpen(true);
                }}
              >
                영양 성분 직접 등록
              </Button>
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        {showFoodCameraButton ? (
          <FloatingCameraButton onClick={handleCameraClick} ariaLabel="사진으로 기록하기" />
        ) : null}

        <Button
          onClick={handleApplySelectedMenus}
          variant="filled"
          interaction={selectedCount > 0 ? "normal" : "disable"}
          size="large"
          color="primary"
          fullWidth
          disabled={selectedCount === 0}
        >
          {selectedCount}개 담겼어요
        </Button>
      </footer>

      <RegisterBottomSheet
        isOpen={isDirectInputSheetOpen}
        onClose={handleCloseDirectInputSheet}
        onSelectNumberInput={handleNavigateNutrientAdd}
        onSelectCameraInput={handleNavigateNutrientCamera}
      />
    </section>
  );
}
