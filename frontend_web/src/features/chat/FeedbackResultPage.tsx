import { useEffect, useMemo, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import {
  buildDiaryMealRecordRequest,
  getChatDateKey,
  getDiaryMealImage,
  getDiaryMealRecordSelectionByMenuIds,
  getFallbackMealTime,
  getNextDiaryMenusByCandidateIds,
  type SelectedDiaryMealRecordMenu,
} from "@/features/chat/utils/chatDiaryMealRecord";
import { getMealTypeFromChatMealTime } from "@/features/chat/utils/chatMeal";
import {
  type FeedbackDetailNavigationState,
  type FeedbackDetailSelectionPayload,
  getFeedbackDetailPath,
  getSafeChatId,
} from "@/features/chat/utils/recommendNavigation";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import { useTodayMealRecordRegisterMutation } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/appApi";
import {
  type ChatFeedbackMenuResponseDto,
  type ChatFoodImageRecognizedMenuResponseDto,
  type ChatHistoryItemResponseDto,
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

type SelectedMealRecordMenu = SelectedDiaryMealRecordMenu;

export default function FeedbackResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));

  const { data: chatHistory, isPending } = useGetChatHistoryQuery();
  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return chatHistory?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, chatHistory?.chat_list]);
  const feedbackMenu =
    chatItem?.response_payload.chat_category === "feedback"
      ? chatItem.response_payload.feedback
      : null;

  useEffect(() => {
    if (chatId === null) {
      navigateBack({ fallbackTo: PATH.CHAT });
      return;
    }

    if (isPending) {
      return;
    }

    if (!feedbackMenu || feedbackMenu.menus.length === 0) {
      navigateBack({ fallbackTo: PATH.CHAT });
    }
  }, [chatId, feedbackMenu, isPending, navigate]);

  if (chatId === null) {
    return null;
  }

  if (isPending && !chatItem) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="메뉴 추천 결과"
          onBack={() => {
            navigateBack({ fallbackTo: PATH.CHAT });
          }}
        />
        <main className={styles.main}>
          <FeedbackResultSkeleton />
        </main>
      </section>
    );
  }

  if (!chatItem || !feedbackMenu || feedbackMenu.menus.length === 0) {
    return null;
  }

  return (
    <FeedbackResultContent
      key={chatItem.id}
      chatItem={chatItem}
      menus={feedbackMenu.menus}
    />
  );
}

function FeedbackResultContent({
  chatItem,
  menus,
}: {
  chatItem: ChatHistoryItemResponseDto;
  menus: ChatFeedbackMenuResponseDto[];
}) {
  const navigate = useNavigate();
  const [selectedMenusOverride, setSelectedMenusOverride] =
    useState<SelectedMealRecordMenu[] | null>(null);
  const chatDateKey = useMemo(() => getChatDateKey(chatItem), [chatItem]);
  const { data: dayMeals, isPending: isDayMealsPending } = useDayMealsQuery(chatDateKey);
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isMealRegisterPending } =
    useTodayMealRecordRegisterMutation();

  const imageUrl = getChatItemImageUrl(chatItem);
  const recognizedFoods = getRecognizedFoods(chatItem);
  const feedbackMenuIds = useMemo(() => menus.map((menu) => menu.menu_id), [menus]);
  const diaryMealRecordSelection = useMemo(
    () => getDiaryMealRecordSelectionByMenuIds(dayMeals, feedbackMenuIds),
    [dayMeals, feedbackMenuIds],
  );
  const targetMealTime = diaryMealRecordSelection?.time ?? getFallbackMealTime(chatItem);
  const mealType: MealType = getMealTypeFromChatMealTime(targetMealTime);
  const selectedMenus = useMemo(
    () => selectedMenusOverride ?? diaryMealRecordSelection?.menus ?? [],
    [diaryMealRecordSelection, selectedMenusOverride],
  );
  const selectedMenuIds = useMemo(() => {
    return new Set(selectedMenus.map((menu) => menu.id));
  }, [selectedMenus]);

  const handleConfirmDetailSelection = (selection: FeedbackDetailSelectionPayload) => {
    if (isDayMealsPending) {
      return;
    }

    setSelectedMenusOverride((prev) => {
      const currentMenus = prev ?? diaryMealRecordSelection?.menus ?? [];
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

  const handleMenuClick = ({ menuId, chatId }: { menuId: number; chatId: number }) => {
    if (isDayMealsPending) {
      return;
    }

    const initialSelection = selectedMenus.find((menu) => menu.id === menuId);
    const state: FeedbackDetailNavigationState = {
      initialSelection: initialSelection
        ? {
            menuId,
            quantity: initialSelection.quantity,
            mode: initialSelection.mode,
          }
        : null,
      onConfirmSelection: handleConfirmDetailSelection,
    };

    navigate(getFeedbackDetailPath(chatId, menuId), { state });
  };

  const handleToggleMenu = (menu: ChatFeedbackMenuResponseDto) => {
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
        candidateIds: feedbackMenuIds,
      });

      await registerDiaryMealRecordMutate(
        buildDiaryMealRecordRequest({
          dateKey: chatDateKey,
          mealType,
          selectedMenus: nextMenus,
          image: getDiaryMealImage(dayMeals, targetMealTime),
        }),
      );

      toast.success(
        diaryMealRecordSelection ? "식사 기록이 수정되었어요." : "식사 기록이 등록되었어요.",
      );
      navigateBack({ fallbackTo: PATH.CHAT });
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title="메뉴 추천 결과"
        onBack={() => {
          navigateBack({ fallbackTo: PATH.CHAT });
        }}
      />

      <main className={styles.main}>
        <section className={styles.content}>
          {imageUrl ? (
            <FoodImageFeedbackPreview
              imageUrl={imageUrl}
              recognizedFoods={recognizedFoods}
              menus={menus}
              isDetailDisabled={isDayMealsPending}
              onMarkerClick={(menuId) => handleMenuClick({ menuId, chatId: chatItem.id })}
            />
          ) : null}

          <ul className={styles.resultList}>
            {menus.map((menu, index) => {
              const isSelected = selectedMenuIds.has(menu.menu_id);

              return (
                <li key={`${menu.menu_id}-${menu.input_menu_name}-${index}`}>
                  <MealMenuCard
                    name={menu.menu_name}
                    calories={menu.calories}
                    unit_quantity={menu.unit_quantity}
                    brand={menu.brand}
                    data_source={menu.data_source}
                    suggestionChipLabel={menu.is_appropriate}
                    weight={menu.weight}
                    unit={menu.unit}
                    icon={isSelected ? "check" : "add"}
                    state={isSelected ? "select" : "default"}
                    onClick={
                      isDayMealsPending
                        ? undefined
                        : () => handleMenuClick({ menuId: menu.menu_id, chatId: chatItem.id })
                    }
                    onIconClick={() => handleToggleMenu(menu)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
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
          {selectedMenus.length}개 {diaryMealRecordSelection ? "수정하기" : "기록하기"}
        </Button>
      </footer>
    </section>
  );
}

function FoodImageFeedbackPreview({
  imageUrl,
  recognizedFoods,
  menus,
  isDetailDisabled,
  onMarkerClick,
}: {
  imageUrl: string;
  recognizedFoods: ChatFoodImageRecognizedMenuResponseDto[];
  menus: ChatFeedbackMenuResponseDto[];
  isDetailDisabled: boolean;
  onMarkerClick: (menuId: number) => void;
}) {
  const menuById = useMemo(() => new Map(menus.map((menu) => [menu.menu_id, menu])), [menus]);

  return (
    <section className={styles.imageFeedbackSection} aria-label="음식 사진 분석 결과">
      <img src={imageUrl} alt="" aria-hidden="true" className={styles.foodImage} />
      {recognizedFoods.length > 0 ? (
        <div className={styles.foodImageDimmer} aria-hidden="true" />
      ) : null}

      {recognizedFoods.map((food, index) => {
        const matchedMenu = menuById.get(food.menu_id);
        const markerX = clampPosition(food.position?.x ?? 0.5);
        const markerY = clampPosition(food.position?.y ?? 0.5);
        const score = matchedMenu?.score;
        const label = matchedMenu?.menu_name ?? food.menu_name;
        const scoreText = typeof score === "number" ? `${Math.round(score)}점` : null;

        return (
          <button
            key={`${food.menu_id}-${food.menu_name}-${index}`}
            type="button"
            className={[
              styles.foodMarker,
              getHorizontalMarkerClass(markerX),
              markerY < 0.18 ? styles.foodMarkerBelow : styles.foodMarkerAbove,
            ].join(" ")}
            style={{
              left: `${markerX * 100}%`,
              top: `${markerY * 100}%`,
            }}
            onClick={() => onMarkerClick(food.menu_id)}
            disabled={isDetailDisabled}
            aria-label={`${label}${scoreText ? ` ${scoreText}` : ""} 상세 보기`}
          >
            <span className={styles.foodMarkerBubble}>
              <span className={`${styles.foodMarkerName} typo-body3`}>{label}</span>
              {scoreText ? (
                <span
                  className={`typo-body2 ${styles.foodMarkerScore} ${getScoreClass(score ?? 0)}`}
                >
                  {scoreText}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function FeedbackResultSkeleton() {
  return (
    <SkeletonStatus className={styles.content} label="추천 결과를 불러오는 중입니다.">
      <ul className={styles.resultList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <article className={styles.resultCard}>
              <div className={styles.cardBody}>
                <div className={styles.textGroup}>
                  <Skeleton width="58%" height={24} radius={999} />
                  <Skeleton width="34%" height={16} radius={999} />
                  <div className={styles.metaRow}>
                    <Skeleton width="38%" height={16} radius={999} />
                    <Skeleton className={styles.calories} width="28%" height={22} radius={999} />
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

function getChatItemImageUrl(chatItem: ChatHistoryItemResponseDto) {
  const imageUrl = chatItem.image_url ?? chatItem.response_payload.image_url ?? "";

  return imageUrl.trim().length > 0 ? imageUrl : null;
}

function getRecognizedFoods(chatItem: ChatHistoryItemResponseDto) {
  if (chatItem.response_payload.chat_category !== "feedback") {
    return [];
  }

  return chatItem.response_payload.recognized_foods ?? [];
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

function clampPosition(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(Math.max(value, 0.08), 0.92);
}

function getHorizontalMarkerClass(x: number) {
  if (x < 0.28) {
    return styles.foodMarkerAlignStart;
  }

  if (x > 0.72) {
    return styles.foodMarkerAlignEnd;
  }

  return styles.foodMarkerAlignCenter;
}

function getScoreClass(score: number) {
  if (score >= 80) {
    return styles.foodMarkerScoreGood;
  }

  if (score >= 40) {
    return styles.foodMarkerScoreOkay;
  }

  if (score >= 0) {
    return styles.foodMarkerScoreBad;
  }

  return styles.foodMarkerScoreError;
}
