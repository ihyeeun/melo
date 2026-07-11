import { Tabs } from "@base-ui/react";
import { PullToRefresh } from "@seed-design/react";
import { useActivity } from "@stackflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftSelectedCount,
  useMenuDraftStore,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
  useSyncMenuDraftWithDayMeals,
} from "@/features/meal-record/stores/menuDraft.store";
import {
  getMealType,
  getSafeDateKey,
  getSafeKeyword,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import RegisterBottomSheet from "@/features/search/components/RegisterBottomSheet";
import { useMealSearchInfiniteQuery } from "@/features/search/menu-record/hooks/queries/useMealSearchInfiniteQuery";
import {
  useGetFrequentlyRecordedMenus,
  useGetRegisteredMenus,
} from "@/features/search/menu-record/hooks/queries/usePersonalMenusQuery";
import { PATH } from "@/router/path";
import { getMealDetailPath, getMealRecordPath, getPathWithMeal } from "@/router/pathHelpers";
import { type MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import {
  isPreviousStackActivity,
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

import styles from "../styles/MealSearch.module.css";

const MENU_SEARCH_PAGE_LIMIT = 20;
const DIRECT_REGISTER_BUTTON_INTERVAL = 15;
const PERSONAL_MENU_TAB = {
  FREQUENTLY_RECORDED: "frequently-recorded",
  REGISTERED: "registered",
} as const;

type PersonalMenuTab = (typeof PERSONAL_MENU_TAB)[keyof typeof PERSONAL_MENU_TAB];

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
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [activePersonalMenuTab, setActivePersonalMenuTab] = useState<PersonalMenuTab>(
    PERSONAL_MENU_TAB.FREQUENTLY_RECORDED,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const draftKey = formatMenuDraftKey(dateKey, mealType);
  const hasSearchKeyword = searchKeyword.trim().length > 0;

  const {
    data: dayMeals,
    isPending: isDayMealsPending,
    isError: isDayMealsError,
  } = useDayMealsQuery(dateKey);
  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const selectedMenus = useMenuDraftMenus(dateKey, mealType);
  const selectedCount = useMenuDraftSelectedCount(dateKey, mealType);
  const draft = useMenuDraftStore((store) => store.drafts[draftKey]);
  const hasDraft = Boolean(draft);
  const isFoodCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.FOOD_CAMERA);
  const showFoodCameraButton = !isFoodCameraBlocked;

  const {
    data: frequentlyRecordedMenus,
    isPending: isFrequentlyRecordedMenusPending,
    isError: isFrequentlyRecordedMenusError,
    refetch: refetchFrequentlyRecordedMenus,
  } = useGetFrequentlyRecordedMenus();
  const {
    data: registeredMenus,
    isPending: isRegisteredMenusPending,
    isError: isRegisteredMenusError,
    refetch: refetchRegisteredMenus,
  } = useGetRegisteredMenus({
    enabled: activePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED && !hasSearchKeyword,
  });

  const selectedMenuIdSet = useMemo(
    () => new Set(selectedMenus.map((menu) => menu.id)),
    [selectedMenus],
  );

  const {
    data: searchResults,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError: isSearchError,
    isPending: isSearchPending,
    refetch: refetchSearchResults,
  } = useMealSearchInfiniteQuery(searchKeyword, {
    enabled: hasDraft,
    limit: MENU_SEARCH_PAGE_LIMIT,
  });

  const firstSearchResult = searchResults?.pages[0];
  const searchMenuList = useMemo(
    () => searchResults?.pages.flatMap((page) => page.menu_list) ?? [],
    [searchResults?.pages],
  );
  const frequentlyRecordedMenuList = frequentlyRecordedMenus?.menu_list ?? [];
  const registeredMenuList = registeredMenus?.menu_list ?? [];

  const resetSearchState = () => {
    setSubmittedKeyword("");
    setSearchKeyword("");
  };

  useSyncMenuDraftWithDayMeals({
    dateKey,
    mealType,
    dayMeals,
    enabled: isTop,
  });

  useEffect(() => {
    if (!isTop || hasDraft || isDayMealsPending || !isDayMealsError) {
      return;
    }

    toast.warning("식사 기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    navigate(getMealRecordPath(dateKey, mealType), { replace: true });
  }, [dateKey, hasDraft, isDayMealsError, isDayMealsPending, isTop, mealType, navigate]);

  const handleToggleMenuSelection = (menu: MenuSimpleResponseDto) => {
    const menuId = menu.id;

    if (selectedMenuIdSet.has(menuId)) {
      removeMenu({ key: draftKey, id: menuId });
      return;
    }

    if (selectedCount + 1 > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
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
    navigate(getMealDetailPath(dateKey, mealType, menuId, searchKeyword));
  };

  const handleApplySelectedMenus = () => {
    if (selectedMenus.length === 0) return;

    resetSearchState();
    const nextPath = getMealRecordPath(dateKey, mealType);
    if (isPreviousStackActivity("MealRecord")) {
      navigateBack({ fallbackTo: nextPath });
      return;
    }

    navigate(nextPath, { replace: true, animate: false });
  };

  const handleClearKeyword = () => {
    resetSearchState();
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
        MEAL_RECORD_MENU_LIMIT_MESSAGE,
        "기존 메뉴를 일부 삭제한 뒤 다시 시도해주세요.",
      );
      return;
    }

    navigate(getPathWithMeal(PATH.FOOD_CAMERA, dateKey, mealType));
  };

  const handleMealSearch = (keyword = submittedKeyword) => {
    const normalizedKeyword = keyword.trim();

    setSearchKeyword(normalizedKeyword);
  };

  const handleRefreshPersonalMenus = async () => {
    if (hasSearchKeyword) return;

    if (activePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED) {
      await refetchRegisteredMenus();
      return;
    }

    await refetchFrequentlyRecordedMenus();
  };

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || isFetchingNextPage) {
          return;
        }

        void fetchNextPage();
      },
      {
        rootMargin: "160px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, searchMenuList.length]);

  const renderMenuCard = (menu: MenuSimpleResponseDto) => {
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
  };

  const renderLoadMoreState = () => (
    <div ref={loadMoreRef} className={styles.loadMoreState}>
      {isFetchingNextPage ? (
        <LoadingIndicator iconSize={24} label="메뉴를 더 불러오는 중입니다." />
      ) : null}
    </div>
  );

  const renderDirectRegisterButton = (key?: string) => (
    <div key={key} className={styles.bottomTextContainer}>
      <Button
        variant="text"
        interaction="normal"
        size="small"
        color="normal"
        onClick={() => {
          setIsDirectInputSheetOpen(true);
        }}
      >
        <span className={`${styles.bottomText} typo-body3`}>찾으시는 메뉴가 없나요?</span>
        직접 등록하기
      </Button>
    </div>
  );

  const renderMenuCardsWithDirectRegisterButtons = () =>
    searchMenuList.flatMap((menu, index) => {
      const menuIndex = index + 1;
      const elements = [renderMenuCard(menu)];

      if (menuIndex % DIRECT_REGISTER_BUTTON_INTERVAL === 0) {
        elements.push(renderDirectRegisterButton(`direct-register-${menuIndex}`));
      }

      return elements;
    });

  const renderPaginationFooter = () => {
    if (hasNextPage) {
      return renderLoadMoreState();
    }

    if (
      searchMenuList.length > 0 &&
      searchMenuList.length % DIRECT_REGISTER_BUTTON_INTERVAL === 0
    ) {
      return null;
    }

    return renderDirectRegisterButton();
  };

  const renderDirectRegisterPrompt = () => (
    <button
      type="button"
      className={styles.directRegisterPrompt}
      onClick={() => {
        setIsDirectInputSheetOpen(true);
      }}
    >
      <span className={`typo-body3`}>찾으시는 메뉴가 없나요?</span>
      <span className={`typo-label3 ${styles.directRegisterPromptAction}`}>
        영양 성분 직접 등록
      </span>
    </button>
  );

  const renderSearchErrorState = () => (
    <section className={styles.emptyResult}>
      <p className="typo-body2">메뉴를 검색하지 못했어요</p>
      <div className={styles.buttonContainer}>
        <Button
          variant="text"
          interaction="normal"
          size="small"
          color="normal"
          onClick={() => {
            void refetchSearchResults();
          }}
        >
          다시 시도
        </Button>
      </div>
    </section>
  );

  const renderPersonalMenuEmptyState = (message: string) => (
    <section className={styles.loadingContainer}>
      <p className="typo-body2">{message}</p>
    </section>
  );

  const renderPersonalMenuPanel = ({
    menuList,
    isPending,
    isError,
    emptyText,
    showDirectRegisterPrompt = false,
  }: {
    menuList: MenuSimpleResponseDto[];
    isPending: boolean;
    isError: boolean;
    emptyText: string;
    showDirectRegisterPrompt?: boolean;
  }) => (
    <div className={styles.personalMenuPanelContent}>
      {showDirectRegisterPrompt ? renderDirectRegisterPrompt() : null}

      {isPending ? (
        <section className={styles.loadingContainer}>
          <LoadingIndicator />
        </section>
      ) : isError ? (
        renderPersonalMenuEmptyState("메뉴를 불러오지 못했어요")
      ) : menuList.length > 0 ? (
        <div className={styles.resultList}>{menuList.map(renderMenuCard)}</div>
      ) : (
        renderPersonalMenuEmptyState(emptyText)
      )}
    </div>
  );

  const renderPersonalMenuTabs = () => (
    <Tabs.Root
      className={styles.personalMenuTabsRoot}
      value={activePersonalMenuTab}
      onValueChange={(nextValue) => {
        setActivePersonalMenuTab(
          nextValue === PERSONAL_MENU_TAB.REGISTERED
            ? PERSONAL_MENU_TAB.REGISTERED
            : PERSONAL_MENU_TAB.FREQUENTLY_RECORDED,
        );
      }}
    >
      <Tabs.List className={styles.personalMenuTabsList}>
        <Tabs.Tab
          value={PERSONAL_MENU_TAB.FREQUENTLY_RECORDED}
          className={`${styles.personalMenuTabsTab} ${
            activePersonalMenuTab === PERSONAL_MENU_TAB.FREQUENTLY_RECORDED
              ? "typo-label1"
              : "typo-label2"
          }`}
        >
          자주 먹었어요
        </Tabs.Tab>
        <Tabs.Tab
          value={PERSONAL_MENU_TAB.REGISTERED}
          className={`${styles.personalMenuTabsTab} ${
            activePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED ? "typo-label1" : "typo-label2"
          }`}
        >
          직접 등록
        </Tabs.Tab>
        <Tabs.Indicator className={styles.personalMenuTabsIndicator} />
      </Tabs.List>

      <PullToRefresh.Root
        className={styles.personalMenuRefreshRoot}
        onPtrRefresh={handleRefreshPersonalMenus}
        threshold={72}
      >
        <PullToRefresh.Indicator className={styles.pullToRefreshIndicator}>
          {({ value }) => (
            <div
              className={styles.pullToRefreshIndicatorInner}
              style={{ opacity: value === undefined ? 1 : value / 100 }}
            >
              <LoadingIndicator iconSize={24} label="메뉴를 새로고침하는 중입니다." />
            </div>
          )}
        </PullToRefresh.Indicator>

        <PullToRefresh.Content className={styles.pullToRefreshContent}>
          <Tabs.Panel
            value={PERSONAL_MENU_TAB.FREQUENTLY_RECORDED}
            className={styles.personalMenuTabsPanel}
          >
            {renderPersonalMenuPanel({
              menuList: frequentlyRecordedMenuList,
              isPending: isFrequentlyRecordedMenusPending,
              isError: isFrequentlyRecordedMenusError,
              emptyText: "자주 먹은 메뉴가 없어요",
            })}
          </Tabs.Panel>

          <Tabs.Panel value={PERSONAL_MENU_TAB.REGISTERED} className={styles.personalMenuTabsPanel}>
            {renderPersonalMenuPanel({
              menuList: registeredMenuList,
              isPending: isRegisteredMenusPending,
              isError: isRegisteredMenusError,
              emptyText: "직접 등록한 메뉴가 없어요",
              showDirectRegisterPrompt: true,
            })}
          </Tabs.Panel>
        </PullToRefresh.Content>
      </PullToRefresh.Root>
    </Tabs.Root>
  );

  const renderSearchContent = () => {
    if (isSearchPending) {
      return (
        <div className={styles.loadingContainer}>
          <LoadingIndicator />
        </div>
      );
    }

    if (isSearchError || !firstSearchResult) {
      return <div className={styles.emptyResultContainer}>{renderSearchErrorState()}</div>;
    }

    if (firstSearchResult.has_result) {
      return (
        <div className={styles.resultList}>
          {renderMenuCardsWithDirectRegisterButtons()}
          {renderPaginationFooter()}
        </div>
      );
    }

    return (
      <div className={styles.emptyResultContainer}>
        {searchMenuList.length === 0 && (
          <section className={styles.emptyResult}>
            <p className="typo-body2">검색 결과가 없어요</p>
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
        )}

        {searchMenuList.length > 0 && (
          <section className={styles.similarSection}>
            {/* <p className={`${styles.similarSectionTitle} typo-title3`}>
              비슷한 메뉴는 어때요?
            </p> */}

            <div className={styles.resultList}>{renderMenuCardsWithDirectRegisterButtons()}</div>

            {renderPaginationFooter()}
          </section>
        )}
      </div>
    );
  };

  //TODO 이거는 무슨 로직인건지 ?
  if (!hasDraft) {
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
          onBack={() => {
            resetSearchState();
            navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) });
          }}
        />

        <main className={styles.main}></main>
      </section>
    );
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
        onBack={() => {
          resetSearchState();
          navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) });
        }}
      />

      <main className={`${styles.main} ${hasSearchKeyword ? styles.searchMain : ""}`}>
        {hasSearchKeyword ? (
          <div className={styles.searchContent}>{renderSearchContent()}</div>
        ) : (
          renderPersonalMenuTabs()
        )}
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
