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
import {
  FOLDER_MENU_LIMIT_MESSAGE,
  MAX_FOLDER_MENUS,
} from "@/features/personal-menu/folder/constants/folder.constants";
import {
  useFolderDraftRemoveSelectedMenu,
  useFolderDraftSelectedCount,
  useFolderDraftSelectedMenus,
  useFolderDraftUpsertSelectedMenu,
} from "@/features/personal-menu/folder/stores/folderDraft.store";
import {
  MAX_MENU_SET_MENUS,
  MENU_SET_MENU_LIMIT_MESSAGE,
} from "@/features/personal-menu/set/constants/menuSet.constants";
import { useMenuSetListInfiniteQuery } from "@/features/personal-menu/set/hooks/queries/useMenuSetListInfiniteQuery";
import {
  useMenuSetDraftClearDraft,
  useMenuSetDraftRemoveSelectedMenu,
  useMenuSetDraftSelectedCount,
  useMenuSetDraftSelectedMenus,
  useMenuSetDraftUpsertSelectedMenu,
} from "@/features/personal-menu/set/stores/menuSetDraft.store";
import RegisterBottomSheet from "@/features/search/components/RegisterBottomSheet";
import {
  useFolderListInfiniteQuery,
  useMealSearchInfiniteQuery,
} from "@/features/search/menu-record/hooks/queries/useMealSearchInfiniteQuery";
import {
  useGetFrequentlyRecordedMenus,
  useGetRegisteredMenus,
} from "@/features/search/menu-record/hooks/queries/usePersonalMenusQuery";
import { PATH } from "@/router/path";
import {
  getFolderDetailPath,
  getFolderMenuDetailPath,
  getMealDetailPath,
  getMealRecordPath,
  getMenuSetDetailPath,
  getMenuSetMenuDetailPath,
  getPathWithMealMode,
} from "@/router/pathHelpers";
import { type MealType } from "@/shared/api/types/api.dto";
import type {
  MenuSetListItemResponseDto,
  MenuSimpleResponseDto,
} from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
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
const FOLDER_SEARCH_MODE = "folder";
const SET_SEARCH_MODE = "set";
const PERSONAL_MENU_TAB = {
  FREQUENTLY_RECORDED: "frequently-recorded",
  FOLDER: "folder",
  REGISTERED: "registered",
} as const;
const DIRECT_REGISTER_FILTER = {
  ALL: "all",
  FOOD: "food",
  SET: "set",
} as const;
const DIRECT_REGISTER_FILTER_OPTIONS = [
  { key: DIRECT_REGISTER_FILTER.ALL, label: "전체" },
  { key: DIRECT_REGISTER_FILTER.FOOD, label: "음식" },
  { key: DIRECT_REGISTER_FILTER.SET, label: "세트" },
] as const;

type PersonalMenuTab = (typeof PERSONAL_MENU_TAB)[keyof typeof PERSONAL_MENU_TAB];
type DirectRegisterFilter = (typeof DIRECT_REGISTER_FILTER)[keyof typeof DIRECT_REGISTER_FILTER];

function getDefaultConsumedWeight(weight: number) {
  return typeof weight === "number" && Number.isFinite(weight) && weight > 0 ? weight : 1;
}

function getSafeInternalReturnPath(value: string | null) {
  const rawPath = value?.trim();

  if (!rawPath?.startsWith("/")) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(rawPath, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function MealSearchPage() {
  const navigate = useNavigate();
  const { isTop } = useActivity();
  const [searchParams] = useSearchParams();

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const initialKeyword = getSafeKeyword(searchParams.get("keyword"));
  const isFolderSearchMode = searchParams.get("mode") === FOLDER_SEARCH_MODE;
  const isSetSearchMode = searchParams.get("mode") === SET_SEARCH_MODE;
  const isPersonalMenuEditSearchMode = isFolderSearchMode || isSetSearchMode;
  const personalMenuEditMode = isFolderSearchMode ? "folder" : isSetSearchMode ? "set" : null;
  const [submittedKeyword, setSubmittedKeyword] = useState(initialKeyword);
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const [activePersonalMenuTab, setActivePersonalMenuTab] = useState<PersonalMenuTab>(
    PERSONAL_MENU_TAB.FREQUENTLY_RECORDED,
  );
  const [activeDirectRegisterFilter, setActiveDirectRegisterFilter] =
    useState<DirectRegisterFilter>(DIRECT_REGISTER_FILTER.ALL);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const menuSetLoadMoreRef = useRef<HTMLDivElement>(null);
  const draftKey = formatMenuDraftKey(dateKey, mealType);
  const hasSearchKeyword = searchKeyword.trim().length > 0;
  const visiblePersonalMenuTab =
    isPersonalMenuEditSearchMode && activePersonalMenuTab === PERSONAL_MENU_TAB.FOLDER
      ? PERSONAL_MENU_TAB.FREQUENTLY_RECORDED
      : activePersonalMenuTab;
  const shouldFetchRegisteredMenus =
    visiblePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED &&
    !hasSearchKeyword &&
    (isPersonalMenuEditSearchMode || activeDirectRegisterFilter !== DIRECT_REGISTER_FILTER.SET);
  const shouldFetchMenuSets =
    !isPersonalMenuEditSearchMode &&
    visiblePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED &&
    !hasSearchKeyword &&
    activeDirectRegisterFilter !== DIRECT_REGISTER_FILTER.FOOD;

  const {
    data: dayMeals,
    isPending: isDayMealsPending,
    isError: isDayMealsError,
  } = useDayMealsQuery(dateKey, { enabled: !isPersonalMenuEditSearchMode });
  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const removeMenu = useMenuDraftRemove();
  const mealSelectedMenus = useMenuDraftMenus(dateKey, mealType);
  const mealSelectedCount = useMenuDraftSelectedCount(dateKey, mealType);
  const draft = useMenuDraftStore((store) => store.drafts[draftKey]);
  const hasDraft = Boolean(draft);
  const upsertFolderSelectedMenu = useFolderDraftUpsertSelectedMenu();
  const removeFolderSelectedMenu = useFolderDraftRemoveSelectedMenu();
  const folderSelectedMenus = useFolderDraftSelectedMenus();
  const folderSelectedCount = useFolderDraftSelectedCount();
  const upsertMenuSetSelectedMenu = useMenuSetDraftUpsertSelectedMenu();
  const removeMenuSetSelectedMenu = useMenuSetDraftRemoveSelectedMenu();
  const menuSetSelectedMenus = useMenuSetDraftSelectedMenus();
  const menuSetSelectedCount = useMenuSetDraftSelectedCount();
  const clearMenuSetDraft = useMenuSetDraftClearDraft();
  const selectedCount = isFolderSearchMode
    ? folderSelectedCount
    : isSetSearchMode
      ? menuSetSelectedCount
      : mealSelectedCount;
  const isFoodCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.FOOD_CAMERA);
  const showFoodCameraButton = !isPersonalMenuEditSearchMode && !isFoodCameraBlocked;
  const personalMenuEditReturnPath = getSafeInternalReturnPath(searchParams.get("returnPath"));
  const personalMenuEditFallbackPath =
    personalMenuEditReturnPath ??
    (isFolderSearchMode ? PATH.CREATE_FOLDER : isSetSearchMode ? PATH.CREATE_MENU_SET : null);

  const buildPersonalMenuEditSearchPath = (keyword = submittedKeyword) => {
    const params = new URLSearchParams();

    if (personalMenuEditMode) {
      params.set("mode", personalMenuEditMode);
    }
    if (keyword.trim().length > 0) {
      params.set("keyword", keyword.trim());
    }
    if (personalMenuEditReturnPath) {
      params.set("returnPath", personalMenuEditReturnPath);
    }

    const query = params.toString();
    return `${PATH.MEAL_RECORD_ADD_SEARCH}${query ? `?${query}` : ""}`;
  };

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
    data: menuSetPages,
    fetchNextPage: fetchNextMenuSetPage,
    hasNextPage: hasNextMenuSetPage,
    isFetchingNextPage: isFetchingNextMenuSetPage,
    isPending: isMenuSetsPending,
    isError: isMenuSetsError,
    refetch: refetchMenuSets,
  } = useMenuSetListInfiniteQuery({
    enabled: shouldFetchMenuSets,
    limit: MENU_SEARCH_PAGE_LIMIT,
  });

  const selectedMenuIdSet = useMemo(
    () =>
      new Set(
        isFolderSearchMode
          ? folderSelectedMenus.map((menu) => menu.requestMenu.menuId)
          : isSetSearchMode
            ? menuSetSelectedMenus.map((menu) => menu.requestMenu.menuId)
          : mealSelectedMenus.map((menu) => menu.id),
      ),
    [
      folderSelectedMenus,
      isFolderSearchMode,
      isSetSearchMode,
      mealSelectedMenus,
      menuSetSelectedMenus,
    ],
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
    enabled: isPersonalMenuEditSearchMode || hasDraft,
    limit: MENU_SEARCH_PAGE_LIMIT,
  });

  const firstSearchResult = searchResults?.pages[0];
  const searchMenuList = useMemo(
    () => searchResults?.pages.flatMap((page) => page.menu_list) ?? [],
    [searchResults?.pages],
  );
  const frequentlyRecordedMenuList = frequentlyRecordedMenus?.menu_list ?? [];
  const registeredMenuList = registeredMenus?.menu_list ?? [];
  const menuSetList = useMemo(
    () => menuSetPages?.pages.flatMap((page) => page.set_list) ?? [],
    [menuSetPages?.pages],
  );

  const resetSearchState = () => {
    setSubmittedKeyword("");
    setSearchKeyword("");
  };

  useSyncMenuDraftWithDayMeals({
    dateKey,
    mealType,
    dayMeals,
    enabled: isTop && !isPersonalMenuEditSearchMode,
  });

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
    navigate(getMealRecordPath(dateKey, mealType), { replace: true });
  }, [
    dateKey,
    hasDraft,
    isDayMealsError,
    isDayMealsPending,
    isPersonalMenuEditSearchMode,
    isTop,
    mealType,
    navigate,
  ]);

  const handleToggleMenuSelection = (menu: MenuSimpleResponseDto) => {
    const menuId = menu.id;

    if (isFolderSearchMode) {
      if (selectedMenuIdSet.has(menuId)) {
        removeFolderSelectedMenu(menuId);
        return;
      }

      if (folderSelectedCount >= MAX_FOLDER_MENUS) {
        toast.warning(FOLDER_MENU_LIMIT_MESSAGE);
        return;
      }

      upsertFolderSelectedMenu({
        viewMenu: menu,
        menuQuantity: getDefaultConsumedWeight(menu.weight),
      });
      return;
    }

    if (isSetSearchMode) {
      if (selectedMenuIdSet.has(menuId)) {
        removeMenuSetSelectedMenu(menuId);
        return;
      }

      if (menuSetSelectedCount >= MAX_MENU_SET_MENUS) {
        toast.warning(MENU_SET_MENU_LIMIT_MESSAGE);
        return;
      }

      upsertMenuSetSelectedMenu({
        viewMenu: menu,
        menuQuantity: getDefaultConsumedWeight(menu.weight),
      });
      return;
    }

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
    if (isFolderSearchMode) {
      navigate(getFolderMenuDetailPath(menuId), {
        state: {
          backReturnPath: buildPersonalMenuEditSearchPath(searchKeyword),
        },
      });
      return;
    }

    if (isSetSearchMode) {
      navigate(getMenuSetMenuDetailPath(menuId), {
        state: {
          backReturnPath: buildPersonalMenuEditSearchPath(searchKeyword),
        },
      });
      return;
    }

    navigate(getMealDetailPath(dateKey, mealType, menuId, searchKeyword));
  };

  const handleApplySelectedMenus = () => {
    if (selectedCount === 0) return;

    resetSearchState();

    if (isFolderSearchMode) {
      navigateBack({ fallbackTo: personalMenuEditFallbackPath ?? PATH.CREATE_FOLDER });
      return;
    }

    if (isSetSearchMode) {
      navigateBack({ fallbackTo: personalMenuEditFallbackPath ?? PATH.CREATE_MENU_SET });
      return;
    }

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
    navigate(
      getPathWithMealMode(
        PATH.NUTRIENT_ADD_REGISTER,
        dateKey,
        mealType,
        personalMenuEditMode,
        submittedKeyword,
      ),
      {
        state: isPersonalMenuEditSearchMode
          ? {
              backReturnPath: buildPersonalMenuEditSearchPath(submittedKeyword),
              ...(personalMenuEditFallbackPath
                ? { afterAddReturnPath: personalMenuEditFallbackPath }
                : {}),
            }
          : undefined,
      },
    );
  };

  const handleNavigateNutrientCamera = () => {
    setIsDirectInputSheetOpen(false);

    navigate(
      getPathWithMealMode(
        PATH.NUTRIENT_ADD,
        dateKey,
        mealType,
        personalMenuEditMode,
        submittedKeyword,
      ),
      {
        state: isPersonalMenuEditSearchMode
          ? {
              backReturnPath: buildPersonalMenuEditSearchPath(submittedKeyword),
              ...(personalMenuEditFallbackPath
                ? { afterAddReturnPath: personalMenuEditFallbackPath }
                : {}),
            }
          : undefined,
      },
    );
  };

  const handleCameraClick = () => {
    if (selectedCount >= MAX_MEAL_RECORD_MENUS) {
      toast.warning(
        MEAL_RECORD_MENU_LIMIT_MESSAGE,
        "기존 메뉴를 일부 삭제한 뒤 다시 시도해주세요.",
      );
      return;
    }

    navigate(getPathWithMealMode(PATH.FOOD_CAMERA, dateKey, mealType, null));
  };

  const handleCreateMenuSet = () => {
    clearMenuSetDraft();
    navigate(PATH.CREATE_MENU_SET);
  };

  const handleMealSearch = (keyword = submittedKeyword) => {
    const normalizedKeyword = keyword.trim();

    setSearchKeyword(normalizedKeyword);
  };

  const handleRefreshPersonalMenus = async () => {
    if (hasSearchKeyword) return;

    if (visiblePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED) {
      const refreshTasks: Array<Promise<unknown>> = [];

      if (shouldFetchRegisteredMenus) {
        refreshTasks.push(refetchRegisteredMenus());
      }

      if (shouldFetchMenuSets) {
        refreshTasks.push(refetchMenuSets());
      }

      await Promise.all(refreshTasks);
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

  useEffect(() => {
    const target = menuSetLoadMoreRef.current;
    if (!target || !shouldFetchMenuSets || !hasNextMenuSetPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || isFetchingNextMenuSetPage) {
          return;
        }

        void fetchNextMenuSetPage();
      },
      {
        rootMargin: "160px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [
    fetchNextMenuSetPage,
    hasNextMenuSetPage,
    isFetchingNextMenuSetPage,
    menuSetList.length,
    shouldFetchMenuSets,
  ]);

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

  const renderMenuSetLoadMoreState = () => (
    <div ref={menuSetLoadMoreRef} className={styles.loadMoreState}>
      {isFetchingNextMenuSetPage ? (
        <LoadingIndicator iconSize={24} label="세트를 더 불러오는 중입니다." />
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
        <SystemIcon name="chevron-right-thin" size={16} />
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
        <SystemIcon name="chevron-right-thin" size={18} />
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

  const renderMenuSetCard = (menuSet: MenuSetListItemResponseDto) => (
    <MealMenuCard
      key={menuSet.set_id}
      name={menuSet.set_name}
      description={menuSet.menu_names.join(", ")}
      calories={menuSet.total_calories}
      hideServingInfo
      icon="add"
      onClick={() => navigate(getMenuSetDetailPath(dateKey, mealType, menuSet.set_id))}
      onIconClick={() => navigate(getMenuSetDetailPath(dateKey, mealType, menuSet.set_id))}
    />
  );

  const renderDirectRegisterFilterChips = () => (
    <div className={styles.directRegisterFilterChips} aria-label="직접 등록 필터">
      {DIRECT_REGISTER_FILTER_OPTIONS.map((option) => {
        const isActive = activeDirectRegisterFilter === option.key;

        return (
          <button
            key={option.key}
            type="button"
            className={`${styles.categoryChip} ${isActive ? styles.categoryChipSelected : ""}`}
            aria-pressed={isActive}
            onClick={() => setActiveDirectRegisterFilter(option.key)}
          >
            <span className="typo-label3">{option.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderRegisteredFoodResult = ({
    emptyText = "직접 등록한 음식이 없어요",
  }: {
    compact?: boolean;
    emptyText?: string;
  } = {}) => {
    if (isRegisteredMenusPending) {
      return (
        <section className={styles.loadingContainer}>
          <LoadingIndicator />
        </section>
      );
    }

    if (isRegisteredMenusError) {
      return renderPersonalMenuEmptyState("메뉴를 불러오지 못했어요");
    }

    if (registeredMenuList.length > 0) {
      return (
        <div className={styles.compactResultList}>
          <div className={styles.folderName}>
            <h3 className="typo-title4 textNormal">음식</h3>
            <Button
              className={styles.directRegisterPromptAction}
              onClick={() => {
                setIsDirectInputSheetOpen(true);
              }}
              variant="text"
              interaction="normal"
              size="small"
              color="normal"
            >
              영양 성분 직접 등록
              <SystemIcon name="chevron-right-thin" size={18} />
            </Button>
          </div>
          {registeredMenuList.map(renderMenuCard)}
        </div>
      );
    }

    return renderPersonalMenuEmptyState(emptyText);
  };

  const renderMenuSetResult = ({
    emptyText = "등록된 세트가 없어요",
  }: {
    compact?: boolean;
    emptyText?: string;
  } = {}) => {
    if (isMenuSetsPending) {
      return (
        <section className={styles.loadingContainer}>
          <LoadingIndicator />
        </section>
      );
    }

    if (isMenuSetsError) {
      return renderPersonalMenuEmptyState("세트를 불러오지 못했어요");
    }

    if (menuSetList.length > 0) {
      return (
        <>
          <div className={styles.folderName}>
            <h3 className="typo-title4 textNormal">세트</h3>
            <Button
              className={styles.directRegisterPromptAction}
              onClick={handleCreateMenuSet}
              variant="text"
              interaction="normal"
              size="small"
              color="normal"
            >
              세트 만들기
              <SystemIcon name="chevron-right-thin" size={18} />
            </Button>
          </div>
          <div className={styles.compactResultList}>{menuSetList.map(renderMenuSetCard)}</div>
          {hasNextMenuSetPage ? renderMenuSetLoadMoreState() : null}
        </>
      );
    }

    return (
      <section className={styles.loadingContainer}>
        <p className="typo-body2">{emptyText}</p>
        <Button
          variant="text"
          interaction="normal"
          size="small"
          color="normal"
          onClick={handleCreateMenuSet}
        >
          세트 만들기
          <SystemIcon name="chevron-right-thin" size={18} />
        </Button>
      </section>
    );
  };

  const renderRegisteredAllResult = () => {
    if (isRegisteredMenusPending || isMenuSetsPending) {
      return (
        <section className={styles.loadingContainer}>
          <LoadingIndicator />
        </section>
      );
    }

    if (isRegisteredMenusError && isMenuSetsError) {
      return renderPersonalMenuEmptyState("직접 등록한 항목을 불러오지 못했어요");
    }

    if (registeredMenuList.length === 0 && menuSetList.length === 0) {
      return renderPersonalMenuEmptyState("직접 등록한 음식/세트가 없어요");
    }

    return (
      <div className={styles.registeredSectionList}>
        {!isRegisteredMenusError && registeredMenuList.length > 0 ? (
          <section className={styles.registeredResultSection}>
            <div className={styles.folderName}>
              <h3 className="typo-title4 textNormal">음식</h3>
              <Button
                className={styles.directRegisterPromptAction}
                onClick={() => {
                  setIsDirectInputSheetOpen(true);
                }}
                variant="text"
                interaction="normal"
                size="small"
                color="normal"
              >
                영양 성분 직접 등록
                <SystemIcon name="chevron-right-thin" size={18} />
              </Button>
            </div>
            <div className={styles.compactResultList}>{registeredMenuList.map(renderMenuCard)}</div>
          </section>
        ) : null}

        {!isMenuSetsError && menuSetList.length > 0 ? (
          <section className={styles.registeredResultSection}>
            <div className={styles.folderName}>
              <h3 className="typo-title4 textNormal">세트</h3>
              <Button
                className={styles.directRegisterPromptAction}
                onClick={handleCreateMenuSet}
                variant="text"
                interaction="normal"
                size="small"
                color="normal"
              >
                세트 만들기
                <SystemIcon name="chevron-right-thin" size={18} />
              </Button>
            </div>
            <div className={styles.compactResultList}>{menuSetList.map(renderMenuSetCard)}</div>
            {hasNextMenuSetPage ? renderMenuSetLoadMoreState() : null}
          </section>
        ) : null}
      </div>
    );
  };

  const renderRegisteredPersonalMenuPanel = () => (
    <div className={styles.personalMenuPanelContent}>
      {!isPersonalMenuEditSearchMode ? renderDirectRegisterFilterChips() : null}

      {isPersonalMenuEditSearchMode || activeDirectRegisterFilter === DIRECT_REGISTER_FILTER.FOOD
        ? renderRegisteredFoodResult()
        : activeDirectRegisterFilter === DIRECT_REGISTER_FILTER.SET
          ? renderMenuSetResult()
          : renderRegisteredAllResult()}
    </div>
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
          className={`${styles.personalMenuTabsTab} ${
            visiblePersonalMenuTab === PERSONAL_MENU_TAB.FREQUENTLY_RECORDED
              ? "typo-label1"
              : "typo-label2"
          }`}
        >
          자주 먹었어요
        </Tabs.Tab>
        {!isPersonalMenuEditSearchMode ? (
          <Tabs.Tab
            value={PERSONAL_MENU_TAB.FOLDER}
            className={`${styles.personalMenuTabsTab} ${
              visiblePersonalMenuTab === PERSONAL_MENU_TAB.FOLDER ? "typo-label1" : "typo-label2"
            }`}
          >
            내 폴더
          </Tabs.Tab>
        ) : null}
        <Tabs.Tab
          value={PERSONAL_MENU_TAB.REGISTERED}
          className={`${styles.personalMenuTabsTab} ${
            visiblePersonalMenuTab === PERSONAL_MENU_TAB.REGISTERED ? "typo-label1" : "typo-label2"
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
            <div className={styles.resultList}>{renderMenuCardsWithDirectRegisterButtons()}</div>
            {renderPaginationFooter()}
          </section>
        )}
      </div>
    );
  };

  const handleSearchPageBack = () => {
    resetSearchState();
    navigateBack({
      fallbackTo: isFolderSearchMode
        ? (personalMenuEditFallbackPath ?? PATH.CREATE_FOLDER)
        : isSetSearchMode
          ? (personalMenuEditFallbackPath ?? PATH.CREATE_MENU_SET)
          : getMealRecordPath(dateKey, mealType),
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
          <LoadingIndicator />
        </section>
      ) : isFolderError ? (
        <div className={styles.emptyResultContainer}>
          <section className={`${styles.emptyResult} ${styles.folderEmptyResult}`}>
            <p className="typo-body2">폴더를 불러오지 못했어요</p>
            <Button
              variant="text"
              interaction="normal"
              size="small"
              color="normal"
              onClick={() => {
                void refetchFolderList();
              }}
            >
              다시 시도
            </Button>
          </section>
        </div>
      ) : folderList.length > 0 ? (
        <div className={styles.folderList}>
          <Button
            variant="text"
            interaction="normal"
            color="normal"
            fullWidth
            className={styles.folderAddAction}
            onClick={() => navigate(PATH.CREATE_FOLDER)}
          >
            <span>새 폴더 만들기</span>
            <SystemIcon name="chevron-right-thin" size={16} />
          </Button>
          {folderList.map((folder) => (
            <button
              key={folder.folder_id}
              type="button"
              className={styles.folderItem}
              onClick={() => navigate(getFolderDetailPath(dateKey, mealType, folder.folder_id))}
            >
              <div className={styles.folderName}>
                <span className={`typo-label2 textNormal`}>{folder.folder_name}</span>
                <SystemIcon name="chevron-right-thin" size={20} className={styles.marginLeftAuto} />
              </div>
              <span className={`typo-body3 ${styles.folderMenuNames}`}>
                {folder.menu_names.join(", ")}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.emptyResultContainer}>
          <section className={`${styles.emptyResult} ${styles.folderEmptyResult}`}>
            <p className="typo-body2">
              자주 먹는 음식을
              <br />
              폴더로 모아두고
              <br />
              빠르게 기록해보세요!
            </p>

            <Button onClick={() => navigate(PATH.CREATE_FOLDER)} size="small" fullWidth>
              <SystemIcon name="plus" size={16} />
              <span>폴더 만들기</span>
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
