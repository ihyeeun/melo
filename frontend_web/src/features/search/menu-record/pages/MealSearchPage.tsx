import { Tabs } from "@base-ui/react";
import { PullToRefresh } from "@seed-design/react";
import { useActivity } from "@stackflow/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { useMenuCacheItems } from "@/features/meal-record/hooks/queries/menuCache";
import {
  formatMenuDraftKey,
  useMenuDraftClear,
  useMenuDraftStore,
  useSyncMenuDraftWithDayMeals,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import { buildMenuDraftSignature } from "@/features/meal-record/utils/menuDraftSync";
import { useMenuSelectionAdapter } from "@/features/menu-selection/hooks/useMenuSelectionAdapter";
import {
  buildMenuSelectionPathContext,
  getMenuSelectionMenuDetailPath,
  getMenuSelectionPath,
  getMenuSelectionRouteContextFromSearchParams,
  MENU_SELECTION_TARGET,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
import RegisterBottomSheet from "@/features/search/components/RegisterBottomSheet";
import { useGetRecentMenusQuery } from "@/features/search/menu-record/hooks/queries/useGetMenus.query";
import {
  useFolderListInfiniteQuery,
  useMealSearchInfiniteQuery,
} from "@/features/search/menu-record/hooks/queries/useMealSearchInfiniteQuery";
import {
  useGetFrequentlyRecordedMenus,
  useGetRegisteredMenus,
} from "@/features/search/menu-record/hooks/queries/usePersonalMenusQuery";
import styles from "@/features/search/styles/MealSearch.module.css";
import { PATH } from "@/router/path";
import {
  getFolderDetailPath,
  getMealDetailPath,
  getMealRecordPath,
  getPathWithMeal,
} from "@/router/pathHelpers";
import type { MealType } from "@/shared/api/types/api.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import {
  isPreviousStackActivity,
  navigateBack,
  useNavigate,
  useSearchParams,
  useStackflowBackHandler,
} from "@/shared/navigation/stackflowNavigation";

const MENU_SEARCH_PAGE_LIMIT = 20;
const DIRECT_REGISTER_BUTTON_INTERVAL = 15;
const PERSONAL_MENU_TAB = {
  FREQUENTLY_RECORDED: "frequently-recorded",
  FOLDER: "folder",
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
  const menuSelectionRouteContext = getMenuSelectionRouteContextFromSearchParams(searchParams);
  const menuSelectionTarget = menuSelectionRouteContext.target ?? MENU_SELECTION_TARGET.MEAL_RECORD;
  const hasMenuSelectionRouteContext = menuSelectionRouteContext.target !== null;
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [activePersonalMenuTab, setActivePersonalMenuTab] = useState<PersonalMenuTab>(
    PERSONAL_MENU_TAB.FREQUENTLY_RECORDED,
  );
  const [isRecentMenuOpen, setIsRecentMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const personalMenuScrollRef = useRef<HTMLDivElement>(null);
  const draftKey = formatMenuDraftKey(dateKey, mealType);
  const hasSearchKeyword = searchKeyword.trim().length > 0;
  const menuSelectionAdapter = useMenuSelectionAdapter({
    mealRecordDateKey: dateKey,
    mealRecordMealType: mealType,
    target: menuSelectionTarget,
  });
  const isFolderSearchMode = menuSelectionAdapter.selectionTarget === MENU_SELECTION_TARGET.FOLDER;
  const isPersonalMenuEditSearchMode = isFolderSearchMode;
  const visiblePersonalMenuTab =
    isPersonalMenuEditSearchMode && activePersonalMenuTab === PERSONAL_MENU_TAB.FOLDER
      ? PERSONAL_MENU_TAB.FREQUENTLY_RECORDED
      : activePersonalMenuTab;
  const shouldFetchRegisteredMenus =
    visiblePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED && !hasSearchKeyword;

  const {
    data: dayMeals,
    isPending: isDayMealsPending,
    isError: isDayMealsError,
  } = useDayMealsQuery(dateKey, { enabled: !isPersonalMenuEditSearchMode });
  const draft = useMenuDraftStore((store) => store.drafts[draftKey]);
  const clearDraft = useMenuDraftClear();
  const hasDraft = Boolean(draft);
  const selectedCount = menuSelectionAdapter.selectedCount;
  const selectedMenuIdSet = menuSelectionAdapter.selectedMenuIdSet;
  const isFoodCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.FOOD_CAMERA);
  const showFoodCameraButton = !isPersonalMenuEditSearchMode && !isFoodCameraBlocked;
  const personalMenuEditFallbackPath =
    menuSelectionRouteContext.returnPath ?? (isFolderSearchMode ? PATH.CREATE_FOLDER : null);
  const backFallbackPath = isFolderSearchMode
    ? (personalMenuEditFallbackPath ?? PATH.CREATE_FOLDER)
    : PATH.DIARY;
  const menuSelectionPathContext = buildMenuSelectionPathContext({
    dateKey,
    mealType,
    routeContext: menuSelectionRouteContext,
    target: menuSelectionAdapter.selectionTarget,
  });

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
    enabled: shouldFetchRegisteredMenus,
  });
  const {
    data: searchResults,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError: isSearchError,
    isPending: isSearchPending,
    refetch: refetchSearchResults,
  } = useMealSearchInfiniteQuery(searchKeyword, {
    enabled: isPersonalMenuEditSearchMode || hasDraft,
    limit: MENU_SEARCH_PAGE_LIMIT,
  });
  const { data: recentRecordMenu, isPending: isRecentRecordMenuPending } =
    useGetRecentMenusQuery(isRecentMenuOpen);

  const firstSearchResult = searchResults?.pages[0];
  const searchMenuIds = useMemo(
    () => searchResults?.pages.flatMap((page) => page.menu_ids) ?? [],
    [searchResults?.pages],
  );
  const searchMenuList = useMenuCacheItems(searchMenuIds);
  const frequentlyRecordedMenuIds = frequentlyRecordedMenus?.menu_ids ?? [];
  const registeredMenuIds = registeredMenus?.menu_ids ?? [];
  const frequentlyRecordedMenuList = useMenuCacheItems(frequentlyRecordedMenuIds);
  const registeredMenuList = useMenuCacheItems(registeredMenuIds);

  const resetSearchState = () => {
    setSubmittedKeyword("");
    setSearchKeyword("");
  };

  const handleBackGuard = () => {
    if (hasSearchKeyword) {
      resetSearchState();
      return true;
    }

    if (isFolderSearchMode || isPreviousStackActivity("MealRecord")) {
      return false;
    }

    // Without a record page underneath, leaving search also ends the unsaved meal draft.
    const hasUnsavedChanges =
      draft &&
      buildMenuDraftSignature({
        menus: draft.existingMenus,
        image: draft.image,
        mealTime: draft.mealTime,
      }) !== (draft.serverSignature ?? buildMenuDraftSignature({ menus: [] }));

    if (hasUnsavedChanges) {
      setIsExitConfirmOpen(true);
      return true;
    }

    clearDraft(draftKey);
    return false;
  };

  useStackflowBackHandler(handleBackGuard);

  useSyncMenuDraftWithDayMeals({
    dateKey,
    mealType,
    dayMeals,
    enabled: isTop && !isPersonalMenuEditSearchMode,
  });

  useLayoutEffect(() => {
    if (hasSearchKeyword) {
      return;
    }

    const scrollElement = personalMenuScrollRef.current;
    if (!scrollElement) {
      return;
    }

    scrollElement.scrollTop = 0;
    scrollElement.scrollLeft = 0;
  }, [hasSearchKeyword, visiblePersonalMenuTab]);

  useEffect(() => {
    if (
      isPersonalMenuEditSearchMode ||
      !isTop ||
      hasDraft ||
      isDayMealsPending ||
      !isDayMealsError
    ) {
      return;
    }

    toast.warning("식사 기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    navigateBack({
      animate: false,
      fallbackTo: backFallbackPath,
      skipBackHandler: true,
    });
  }, [
    backFallbackPath,
    hasDraft,
    isDayMealsError,
    isDayMealsPending,
    isPersonalMenuEditSearchMode,
    isTop,
  ]);

  const handleToggleMenuSelection = (menu: MenuSimpleResponseDto) => {
    const menuId = menu.id;

    if (selectedMenuIdSet.has(menuId)) {
      menuSelectionAdapter.removeSelectedMenu(menuId);
      return;
    }

    if (selectedCount >= menuSelectionAdapter.maxSelectableMenuCount) {
      toast.warning(menuSelectionAdapter.menuCountLimitMessage);
      return;
    }

    menuSelectionAdapter.upsertSelectedMenu({
      viewMenu: menu,
      menuQuantity: getDefaultConsumedWeight(menu.weight),
    });
  };

  const handleMenuDetailPageOpen = (menuId: number) => {
    if (hasMenuSelectionRouteContext) {
      navigate(
        getMenuSelectionMenuDetailPath({
          ...menuSelectionPathContext,
          menuId,
        }),
      );
      return;
    }

    navigate(getMealDetailPath(dateKey, mealType, menuId));
  };

  const handleApplySelectedMenus = () => {
    if (selectedCount === 0) return;

    resetSearchState();

    if (isFolderSearchMode) {
      navigateBack({
        fallbackTo: personalMenuEditFallbackPath ?? PATH.CREATE_FOLDER,
        skipBackHandler: true,
      });
      return;
    }

    const nextPath = getMealRecordPath(dateKey, mealType);
    if (isPreviousStackActivity("MealRecord")) {
      navigateBack({ fallbackTo: nextPath, skipBackHandler: true });
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

    if (hasMenuSelectionRouteContext) {
      navigate(
        getMenuSelectionPath({
          path: PATH.NUTRIENT_ADD_REGISTER,
          ...menuSelectionPathContext,
        }),
      );
      return;
    }

    navigate(getPathWithMeal(PATH.NUTRIENT_ADD_REGISTER, dateKey, mealType));
  };

  const handleNavigateNutrientCamera = () => {
    setIsDirectInputSheetOpen(false);

    if (hasMenuSelectionRouteContext) {
      navigate(
        getMenuSelectionPath({
          path: PATH.NUTRIENT_CAMERA,
          ...menuSelectionPathContext,
        }),
      );
      return;
    }

    navigate(getPathWithMeal(PATH.NUTRIENT_CAMERA, dateKey, mealType));
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

    if (visiblePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED) {
      if (shouldFetchRegisteredMenus) {
        await refetchRegisteredMenus();
      }

      return;
    }

    if (visiblePersonalMenuTab === PERSONAL_MENU_TAB.FOLDER) {
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
        icon={"add"}
        state={isSelected}
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
        size="xs"
        onClick={() => {
          setIsDirectInputSheetOpen(true);
        }}
      >
        <span className={`${styles.bottomText} body-s-medium`}>찾으시는 메뉴가 없나요?</span>
        직접 등록하기
        <SystemIcon name="chevron-right" size={16} />
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
      <span className={`body-s-medium`}>찾으시는 메뉴가 없나요?</span>
      <span className={`body-m-regular ${styles.directRegisterPromptAction}`}>
        영양 성분 직접 등록
        <SystemIcon name="chevron-right" size={18} />
      </span>
    </button>
  );
  const renderSearchErrorState = () => (
    <section className={styles.emptyResult}>
      <p className="body-l-medium">메뉴를 검색하지 못했어요</p>
      <div className={styles.buttonContainer}>
        <Button
          variant="text"
          size="xs"
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
    <section className={`${styles.emptyResultContainer} ${styles.emptyResult}`}>
      <p className="body-l-medium">{message}</p>
    </section>
  );

  const renderRegisteredFoodResult = () => {
    if (isRegisteredMenusPending) {
      return (
        <section className={styles.loadingContainer}>
          <LoadingIndicator iconSize={24} />
        </section>
      );
    }

    if (isRegisteredMenusError) {
      return renderPersonalMenuEmptyState("메뉴를 불러오지 못했어요");
    }

    return (
      <div className={styles.compactResultList}>
        <div className={` ${styles.marginTop}`}>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => {
              setIsDirectInputSheetOpen(true);
            }}
          >
            <SystemIcon name="plus-circle" size={18} />
            <p className="body-m-regular">영양 성분 직접 등록</p>
          </button>
        </div>
        {registeredMenuList.map(renderMenuCard)}
      </div>
    );
  };

  const renderRegisteredPersonalMenuPanel = () => (
    <div className={styles.personalMenuPanelContent}>{renderRegisteredFoodResult()}</div>
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
          <LoadingIndicator iconSize={24} />
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
      value={visiblePersonalMenuTab}
      onValueChange={(nextValue) => {
        if (
          nextValue === PERSONAL_MENU_TAB.FREQUENTLY_RECORDED ||
          nextValue === PERSONAL_MENU_TAB.FOLDER ||
          nextValue === PERSONAL_MENU_TAB.REGISTERED
        ) {
          setActivePersonalMenuTab(nextValue);
        }
      }}
    >
      <Tabs.List
        className={`${styles.personalMenuTabsList} ${
          isPersonalMenuEditSearchMode ? styles.personalMenuTabsListTwoColumns : ""
        }`}
      >
        <Tabs.Tab
          value={PERSONAL_MENU_TAB.FREQUENTLY_RECORDED}
          className={`${styles.personalMenuTabsTab} body-s-medium`}
        >
          자주 먹었어요
        </Tabs.Tab>
        {!isPersonalMenuEditSearchMode ? (
          <Tabs.Tab
            value={PERSONAL_MENU_TAB.FOLDER}
            className={`${styles.personalMenuTabsTab} body-s-medium`}
          >
            내 폴더
          </Tabs.Tab>
        ) : null}
        <Tabs.Tab
          value={PERSONAL_MENU_TAB.REGISTERED}
          className={`${styles.personalMenuTabsTab} body-s-medium`}
        >
          내 등록 메뉴
        </Tabs.Tab>
        <Tabs.Indicator className={styles.personalMenuTabsIndicator} />
      </Tabs.List>

      <PullToRefresh.Root
        ref={personalMenuScrollRef}
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

          {!isPersonalMenuEditSearchMode ? (
            <Tabs.Panel value={PERSONAL_MENU_TAB.FOLDER} className={styles.personalMenuTabsPanel}>
              <FolderPanel
                isActive={visiblePersonalMenuTab === PERSONAL_MENU_TAB.FOLDER}
                dateKey={dateKey}
                mealType={mealType}
              />
            </Tabs.Panel>
          ) : null}

          <Tabs.Panel value={PERSONAL_MENU_TAB.REGISTERED} className={styles.personalMenuTabsPanel}>
            {renderRegisteredPersonalMenuPanel()}
          </Tabs.Panel>
        </PullToRefresh.Content>
      </PullToRefresh.Root>
    </Tabs.Root>
  );

  const renderRecentRecordMenuContent = () => {
    if (isRecentRecordMenuPending)
      return (
        <section className={styles.recentMenuSection}>
          <h2 className="title-s-semi text-primary">최근에 먹었어요</h2>
          <p>로딩</p>
        </section>
      );

    const recentMenus = recentRecordMenu ?? [];

    return (
      <section className={styles.recentMenuSection}>
        <div className={styles.recentMenuTitle}>
          <h2 className="title-s-semi text-primary">최근에 먹었어요</h2>
          <button
            type="button"
            onClick={() => setIsRecentMenuOpen(false)}
            className="text-secondary marginLeft"
          >
            <SystemIcon name="exit" size={18} />
          </button>
        </div>

        <div className={styles.recentMenuList}>
          {recentMenus.map((menu) => (
            <button
              type="button"
              onClick={() => handleMenuDetailPageOpen(menu.menu_id)}
              className={styles.recentMenuItem}
            >
              <span className={`body-l-medium text-primary ellipsis`}>{menu.menu_name}</span>
              {menu.menu_brand && (
                <span className={`caption-m-regular text-tertiary ellipsis`}>
                  {menu.menu_brand}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderSearchContent = () => {
    if (isSearchPending) {
      return (
        <div className={styles.loadingContainer}>
          <LoadingIndicator iconSize={24} />
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
          <section className={styles.searchEmptyResult}>
            <img src="/icons/characters/question.png" alt="" aria-hidden="true" width={200} />

            <p className="body-l-medium text-tertiary">검색 결과가 없어요</p>
            <Button
              variant="text"
              size="xs"
              onClick={() => {
                setIsDirectInputSheetOpen(true);
              }}
            >
              <p className="body-s-medium text-secondary">영양 성분 직접 등록</p>
            </Button>
          </section>
        )}

        {searchMenuList.length > 0 && (
          <section className={styles.similarSection}>
            <div className={styles.resultList}>{renderMenuCardsWithDirectRegisterButtons()}</div>
            {renderPaginationFooter()}
          </section>
        )}
      </div>
    );
  };

  const handleSearchPageBack = () => {
    navigateBack({ fallbackTo: backFallbackPath });
  };

  const handleExit = () => {
    clearDraft(draftKey);
    navigateBack({
      fallbackTo: backFallbackPath,
      skipBackHandler: true,
    });
  };

  if (!isPersonalMenuEditSearchMode && !hasDraft) {
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
          onBack={handleSearchPageBack}
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
        onBack={handleSearchPageBack}
        onFocus={() => setIsRecentMenuOpen(true)}
      />

      <main className={`${styles.main} ${hasSearchKeyword ? styles.searchMain : ""}`}>
        {hasSearchKeyword ? (
          <div className={styles.searchContent}>{renderSearchContent()}</div>
        ) : isRecentMenuOpen ? (
          renderRecentRecordMenuContent()
        ) : (
          renderPersonalMenuTabs()
        )}
      </main>

      <footer className={styles.footer}>
        {showFoodCameraButton ? (
          <FloatingCameraButton
            onClick={handleCameraClick}
            bottomOffset="calc(var(--safe-area-bottom) + 70px)"
            ariaLabel="사진으로 기록하기"
          />
        ) : null}

        <Button
          onClick={handleApplySelectedMenus}
          variant="default"
          size="m"
          fullWidth
          disabled={selectedCount === 0}
        >
          {isPersonalMenuEditSearchMode
            ? `${selectedCount}개 추가하기`
            : `${selectedCount}개 담겼어요`}
        </Button>
      </footer>

      <RegisterBottomSheet
        isOpen={isDirectInputSheetOpen}
        onClose={handleCloseDirectInputSheet}
        onSelectNumberInput={handleNavigateNutrientAdd}
        onSelectCameraInput={handleNavigateNutrientCamera}
      />

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

function FolderPanel({
  dateKey,
  isActive,
  mealType,
}: {
  dateKey: string;
  isActive: boolean;
  mealType: MealType;
}) {
  const navigate = useNavigate();
  const {
    data: folders,
    isPending: isFolderPending,
    isError: isFolderError,
    refetch: refetchFolderList,
  } = useFolderListInfiniteQuery({
    enabled: isActive,
    limit: MENU_SEARCH_PAGE_LIMIT,
  });
  const folderList = folders?.pages.flatMap((page) => page.folder_list) ?? [];

  return (
    <div className={styles.searchContent}>
      {isFolderPending ? (
        <section className={styles.loadingContainer}>
          <LoadingIndicator iconSize={24} />
        </section>
      ) : isFolderError ? (
        <div className={styles.emptyResultContainer}>
          <section className={`${styles.emptyResult} ${styles.folderEmptyResult}`}>
            <p className="body-l-medium">폴더를 불러오지 못했어요</p>
            <Button
              variant="text"
              size="xs"
              onClick={() => {
                void refetchFolderList();
              }}
            >
              다시 시도
            </Button>
          </section>
        </div>
      ) : (
        <div className={styles.folderList}>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => navigate(PATH.CREATE_FOLDER)}
          >
            <SystemIcon name="plus-circle" size={18} />
            <p className="body-m-regular">새 폴더 만들기</p>
          </button>
          {folderList.map((folder) => (
            <article key={folder.folder_id} className={styles.folderItem}>
              <button
                type="button"
                className={styles.folderContentButton}
                onClick={() => navigate(getFolderDetailPath(dateKey, mealType, folder.folder_id))}
              >
                <div className={styles.folderContent}>
                  <div className={styles.folderName}>
                    <span className={`body-l-medium text-primary ${styles.folderTitle}`}>
                      {folder.folder_name}
                    </span>
                  </div>
                  <span className={`body-s-regular text-secondary ${styles.folderMenuNames}`}>
                    {folder.menu_names.join(", ")}
                  </span>
                </div>
                <SystemIcon name="chevron-right" size={18} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
