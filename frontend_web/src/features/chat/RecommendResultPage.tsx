import { useEffect, useMemo, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import { useRequestChatMealRecordFocus } from "@/features/chat/stores/mealRecordFocus.store";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import {
  buildDiaryMealRecordRequest,
  getCurrentMealTime,
  getDiaryMealImage,
  getDiaryMealRecordSelectionByMenuIds,
  getNextDiaryMenusByCandidateIds,
  type SelectedDiaryMealRecordMenu,
} from "@/features/chat/utils/chatDiaryMealRecord";
import { getMealTypeFromChatMealTime } from "@/features/chat/utils/chatMeal";
import {
  type ChatMenuDetailNavigationState,
  type ChatMenuDetailSelectionPayload,
  getRecommendDetailPath,
  getRecommendResultPath,
  getSafeChatId,
} from "@/features/chat/utils/recommendNavigation";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { useTodayMealRecordRegisterMutation } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { trackRecommendMenuSave } from "@/shared/analytics/recommendMenuEvents";
import { AppApiError } from "@/shared/api/apiClient";
import {
  type ChatHistoryItemResponseDto,
  type ChatRecommendItemResponseDto,
  type MealType,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

type RecommendFilter = "all" | "brand" | "food";
type SelectedMealRecordMenu = SelectedDiaryMealRecordMenu;

const RECOMMEND_FILTER_OPTIONS: { key: RecommendFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "brand", label: "브랜드" },
  { key: "food", label: "음식" },
];

export default function RecommendResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));

  const { data, isPending } = useGetChatHistoryQuery();
  const { data: profile } = useGetProfileQuery();

  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return data?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, data?.chat_list]);
  const recommendationPayload =
    chatItem?.response_payload?.chat_category === "recommendation"
      ? chatItem.response_payload
      : null;

  useEffect(() => {
    if (chatId === null) {
      navigate(PATH.CHAT, { replace: true });
      return;
    }

    if (isPending) {
      return;
    }

    if (!recommendationPayload || recommendationPayload.recommendations.length === 0) {
      navigate(PATH.CHAT, { replace: true });
    }
  }, [chatId, isPending, navigate, recommendationPayload]);

  if (chatId === null) {
    return null;
  }

  if (isPending && !chatItem) {
    return (
      <section className={styles.page}>
        <PageHeader title="메뉴 추천 결과" onBack={() => navigateBack({ fallbackTo: PATH.CHAT })} />
        <main className={styles.main}>
          <RecommendResultSkeleton />
        </main>
      </section>
    );
  }

  if (!chatItem || !recommendationPayload || recommendationPayload.recommendations.length === 0) {
    return null;
  }

  return (
    <RecommendResultContent
      key={chatItem.id}
      chatItem={chatItem}
      recommendations={recommendationPayload.recommendations}
      profileNickname={profile?.nickname ?? ""}
    />
  );
}

function RecommendResultContent({
  chatItem,
  recommendations,
  profileNickname,
}: {
  chatItem: ChatHistoryItemResponseDto;
  recommendations: ChatRecommendItemResponseDto[];
  profileNickname: string;
}) {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<RecommendFilter>("all");
  const [selectedMenusOverride, setSelectedMenusOverride] = useState<
    SelectedMealRecordMenu[] | null
  >(null);
  const recordDateKey = getTodayFormatDateKey();
  const currentMealTime = getCurrentMealTime();
  const { data: dayMeals, isPending: isDayMealsPending } = useDayMealsQuery(recordDateKey);
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isMealRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const recommendationMenuIds = useMemo(
    () => recommendations.map((menu) => menu.menu_id),
    [recommendations],
  );
  const diaryMealRecordSelection = useMemo(
    () => getDiaryMealRecordSelectionByMenuIds(dayMeals, recommendationMenuIds, currentMealTime),
    [currentMealTime, dayMeals, recommendationMenuIds],
  );
  const targetMealTime = currentMealTime;
  const mealType: MealType = getMealTypeFromChatMealTime(targetMealTime);
  const selectedMenus = useMemo(
    () => selectedMenusOverride ?? diaryMealRecordSelection?.menus ?? [],
    [diaryMealRecordSelection, selectedMenusOverride],
  );
  const requestChatMealRecordFocus = useRequestChatMealRecordFocus();
  const selectedMenuIds = useMemo(() => {
    return new Set(selectedMenus.map((menu) => menu.id));
  }, [selectedMenus]);
  const filteredRecommendations = useMemo(() => {
    if (selectedFilter === "brand") {
      return recommendations.filter((item) => hasBrand(item.brand));
    }

    if (selectedFilter === "food") {
      return recommendations.filter((item) => !hasBrand(item.brand));
    }

    return recommendations;
  }, [recommendations, selectedFilter]);

  const handleConfirmDetailSelection = (selection: ChatMenuDetailSelectionPayload) => {
    if (isDayMealsPending) {
      return;
    }

    setSelectedMenusOverride((prev) => {
      const currentMenus = prev ?? selectedMenus;
      const nextMenu: SelectedMealRecordMenu = {
        id: selection.menuId,
        quantity: selection.quantity,
        mode: selection.mode,
      };
      const existingIndex = currentMenus.findIndex((menu) => menu.id === selection.menuId);

      if (existingIndex === -1) {
        return [...currentMenus, nextMenu];
      }

      return currentMenus.map((menu) => (menu.id === selection.menuId ? nextMenu : menu));
    });
  };

  const handleMenuClick = (menuId: number) => {
    if (isDayMealsPending) {
      return;
    }

    const initialSelection = selectedMenus.find((menu) => menu.id === menuId);
    const state: ChatMenuDetailNavigationState = {
      fallbackTo: getRecommendResultPath(chatItem.id),
      initialSelection: initialSelection
        ? {
            menuId,
            quantity: initialSelection.quantity,
            mode: initialSelection.mode,
          }
        : null,
      onConfirmSelection: handleConfirmDetailSelection,
    };

    navigate(getRecommendDetailPath(chatItem.id, menuId), { state });
  };

  const handleToggleMenu = (menu: ChatRecommendItemResponseDto) => {
    if (isDayMealsPending) {
      return;
    }

    setSelectedMenusOverride((prev) => {
      const currentMenus = prev ?? diaryMealRecordSelection?.menus ?? [];
      const isAlreadySelected = currentMenus.some((item) => item.id === menu.menu_id);

      if (isAlreadySelected) {
        return currentMenus.filter((item) => item.id !== menu.menu_id);
      }

      return [
        ...currentMenus,
        {
          id: menu.menu_id,
          quantity: menu.weight,
          mode: "unit",
        },
      ];
    });
  };

  const handleSubmitMealRecord = async () => {
    if (!dayMeals) {
      toast.warning("식사 기록을 등록할 수 없어요.");
      return;
    }

    try {
      const nextMenus = getNextDiaryMenusByCandidateIds({
        dayMeals,
        time: targetMealTime,
        selectedMenus,
        candidateIds: recommendationMenuIds,
      });

      if (nextMenus.length > MAX_MEAL_RECORD_MENUS) {
        toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
        return;
      }

      const previousSelectedMenuIds = new Set(
        diaryMealRecordSelection?.menus.map((menu) => menu.id) ?? [],
      );
      const canceledMenus = recommendations.filter(
        (menu) => previousSelectedMenuIds.has(menu.menu_id) && !selectedMenuIds.has(menu.menu_id),
      );

      await registerDiaryMealRecordMutate({
        ...buildDiaryMealRecordRequest({
          dateKey: recordDateKey,
          mealType,
          selectedMenus: nextMenus,
          image: getDiaryMealImage(dayMeals, targetMealTime),
        }),
        analytics: {
          recommendMenuCancel: canceledMenus,
        },
      });

      trackRecommendMenuSave(recommendations.filter((menu) => selectedMenuIds.has(menu.menu_id)));

      toast.success("식사 기록이 등록되었어요.");
      requestChatMealRecordFocus({
        dateKey: recordDateKey,
        mealTime: targetMealTime,
      });
      navigateBack({ fallbackTo: PATH.CHAT });
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  return (
    <section className={styles.page}>
      <PageHeader title="메뉴 추천 결과" onBack={() => navigateBack({ fallbackTo: PATH.CHAT })} />

      <section className={styles.titleSection}>
        <div className={styles.intro}>
          <p className={`${styles.introMessage} typo-title2`}>
            <span className={styles.textPrimary}>{profileNickname}</span>님을 위한
            <br />
            메뉴를 추천해드려요!
          </p>

          <img src="/icons/character-love.svg" className={styles.characterImage} />
        </div>
        <div className={styles.filterList} aria-label="추천 결과 필터">
          {RECOMMEND_FILTER_OPTIONS.map((option) => {
            const isSelected = selectedFilter === option.key;

            return (
              <button
                key={option.key}
                type="button"
                className={`${styles.filterBadge} ${isSelected ? styles.filterBadgeSelected : ""} typo-label4`}
                aria-pressed={isSelected}
                onClick={() => setSelectedFilter(option.key)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <main className={styles.main}>
        {filteredRecommendations.length > 0 ? (
          <ul className={styles.resultList}>
            {filteredRecommendations.map((item) => {
              const isSelected = selectedMenuIds.has(item.menu_id);

              return (
                <li key={item.menu_id}>
                  <MealMenuCard
                    rank={item.rank}
                    name={item.menu_name}
                    calories={item.calories}
                    unit_quantity={item.unit_quantity}
                    brand={item.brand}
                    data_source={item.data_source}
                    weight={item.weight}
                    unit={item.unit}
                    icon={isSelected ? "check" : "add"}
                    state={isSelected ? "select" : "default"}
                    onClick={() => handleMenuClick(item.menu_id)}
                    onIconClick={isDayMealsPending ? undefined : () => handleToggleMenu(item)}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={`${styles.emptyStatus} typo-label4`}>해당하는 추천 메뉴가 없어요.</p>
        )}
      </main>

      <footer className={styles.footer}>
        <Button
          fullWidth
          variant="filled"
          size="large"
          color="primary"
          disabled={selectedMenus.length === 0 || isMealRegisterPending || isDayMealsPending}
          onClick={handleSubmitMealRecord}
        >
          {/* {selectedMenus.length}개 {diaryMealRecordSelection ? "수정하기" : "기록하기"} */}
          {selectedMenus.length}개 기록하기
        </Button>
      </footer>
    </section>
  );
}

function RecommendResultSkeleton() {
  return (
    <SkeletonStatus className={styles.content} label="추천 결과를 불러오는 중입니다.">
      <div className={styles.intro}>
        <div className={styles.skeletonIntroText}>
          <Skeleton width="78%" height={24} radius={999} />
          <Skeleton width="46%" height={24} radius={999} />
        </div>
        <Skeleton width={80} height={80} variant="circle" />
      </div>

      <ul className={styles.resultList}>
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index}>
            <article className={styles.resultCard}>
              <Skeleton width={42} height={22} radius={4} />
              <div className={styles.cardBody}>
                <div className={styles.textGroup}>
                  <Skeleton width="54%" height={24} radius={999} />
                  <Skeleton width="86%" height={16} radius={999} />
                  <div className={styles.metaRow}>
                    <Skeleton width="30%" height={16} radius={999} />
                    <Skeleton width="26%" height={16} radius={999} />
                    <Skeleton
                      className={`${styles.calories} textNoWrap`}
                      width="26%"
                      height={22}
                      radius={999}
                    />
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </SkeletonStatus>
  );
}

function hasBrand(brand?: string) {
  return Boolean(brand?.trim());
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof AppApiError && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.";
}
