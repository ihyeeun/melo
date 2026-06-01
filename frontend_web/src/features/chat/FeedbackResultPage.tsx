import { useEffect, useMemo, useRef, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import { useRequestChatMealRecordFocus } from "@/features/chat/stores/mealRecordFocus.store";
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

const FOOD_MARKER_CLUSTER_GAP = 8;
const FOOD_MARKER_BUBBLE_MAX_WIDTH = 220;
const FOOD_MARKER_BUBBLE_MIN_WIDTH = 86;
const FOOD_MARKER_BUBBLE_MIN_HEIGHT = 46;
const FOOD_MARKER_BUBBLE_SIDE_OFFSET = 24;
const FOOD_MARKER_BUBBLE_ANCHOR_GAP = 10;
const FOOD_MARKER_BUBBLE_HORIZONTAL_PADDING = 24;
const FOOD_MARKER_BUBBLE_CONTENT_GAP = 8;
const FOOD_MARKER_SCORE_TEXT_WIDTH = 35;
const FOOD_MARKER_BUBBLE_TEXT_LINE_HEIGHT = 20;
const FOOD_MARKER_FALLBACK_LAYOUT_SIZE = 360;

type FoodMarkerItem = {
  id: string;
  food: ChatFoodImageRecognizedMenuResponseDto;
  index: number;
  label: string;
  markerX: number;
  markerY: number;
  score: number | undefined;
  scoreText: string | null;
};

type FoodMarkerCluster = {
  id: string;
  markers: FoodMarkerItem[];
  rect: FoodMarkerRect;
  x: number;
  y: number;
};

type FoodMarkerLayout = {
  height: number;
  width: number;
};

type FoodMarkerRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

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
          title="메뉴 결과"
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

  return <FeedbackResultContent key={chatItem.id} chatItem={chatItem} menus={feedbackMenu.menus} />;
}

function FeedbackResultContent({
  chatItem,
  menus,
}: {
  chatItem: ChatHistoryItemResponseDto;
  menus: ChatFeedbackMenuResponseDto[];
}) {
  const navigate = useNavigate();
  const [selectedMenusOverride, setSelectedMenusOverride] = useState<
    SelectedMealRecordMenu[] | null
  >(null);
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
  const requestChatMealRecordFocus = useRequestChatMealRecordFocus();
  const selectedMenuIds = useMemo(() => {
    return new Set(selectedMenus.map((menu) => menu.id));
  }, [selectedMenus]);

  const handleConfirmDetailSelection = (selection: FeedbackDetailSelectionPayload) => {
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
      const currentMenus = prev ?? selectedMenus;
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
      const previousSelectedMenuIds = new Set(
        diaryMealRecordSelection?.menus.map((menu) => menu.id) ?? [],
      );
      const canceledMenus = menus.filter(
        (menu) => previousSelectedMenuIds.has(menu.menu_id) && !selectedMenuIds.has(menu.menu_id),
      );

      await registerDiaryMealRecordMutate({
        ...buildDiaryMealRecordRequest({
          dateKey: chatDateKey,
          mealType,
          selectedMenus: nextMenus,
          image: getDiaryMealImage(dayMeals, targetMealTime),
        }),
        analytics: {
          recommendMenuCancel: canceledMenus,
        },
      });

      toast.success("식사 기록이 등록되었어요.");
      requestChatMealRecordFocus({
        dateKey: chatDateKey,
        mealTime: targetMealTime,
      });
      navigateBack({ fallbackTo: PATH.CHAT });
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title="메뉴 결과"
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
          {selectedMenus.length}개 기록하기
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
  const imageFeedbackSectionRef = useRef<HTMLElement | null>(null);
  const [imageFeedbackSize, setImageFeedbackSize] = useState<FoodMarkerLayout>({
    height: 0,
    width: 0,
  });
  const [openSourceMarkerId, setOpenSourceMarkerId] = useState<string | null>(null);
  const menuById = useMemo(() => new Map(menus.map((menu) => [menu.menu_id, menu])), [menus]);
  const foodMarkers = useMemo(
    () =>
      recognizedFoods.map((food, index) => {
        const matchedMenu = menuById.get(food.menu_id);
        const markerX = clampPosition(food.position?.x ?? 0.5);
        const markerY = clampPosition(food.position?.y ?? 0.5);
        const score = matchedMenu?.score;
        const label = matchedMenu?.menu_name ?? food.menu_name;
        const scoreText = typeof score === "number" ? `${Math.round(score)}점` : null;

        return {
          id: `food-${food.menu_id}-${index}`,
          food,
          index,
          label,
          markerX,
          markerY,
          score,
          scoreText,
        };
      }),
    [menuById, recognizedFoods],
  );
  const foodMarkerClusters = useMemo(
    () => clusterFoodMarkers(foodMarkers, imageFeedbackSize),
    [foodMarkers, imageFeedbackSize],
  );
  const foodMarkerSourcePinClusters = foodMarkerClusters.filter(
    (cluster) => cluster.markers.length > 1,
  );
  const visibleOpenSourceMarkerId =
    openSourceMarkerId &&
    foodMarkerSourcePinClusters.some((cluster) =>
      cluster.markers.some((marker) => marker.id === openSourceMarkerId),
    )
      ? openSourceMarkerId
      : null;

  useEffect(() => {
    const sectionElement = imageFeedbackSectionRef.current;

    if (!sectionElement) {
      return;
    }

    const updateImageFeedbackSize = () => {
      const rect = sectionElement.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      setImageFeedbackSize((previousSize) => {
        if (
          Math.abs(previousSize.width - rect.width) < 0.5 &&
          Math.abs(previousSize.height - rect.height) < 0.5
        ) {
          return previousSize;
        }

        return {
          height: rect.height,
          width: rect.width,
        };
      });
    };

    let animationFrameId = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateImageFeedbackSize);
    };

    scheduleUpdate();

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);

    resizeObserver?.observe(sectionElement);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <section
      ref={imageFeedbackSectionRef}
      className={styles.imageFeedbackSection}
      aria-label="음식 사진 분석 결과"
    >
      <img src={imageUrl} alt="" aria-hidden="true" className={styles.foodImage} />
      {recognizedFoods.length > 0 ? (
        <div className={styles.foodImageDimmer} aria-hidden="true" />
      ) : null}

      {foodMarkerClusters.map((cluster) => {
        const markerX = cluster.x;
        const markerY = cluster.y;
        const isCluster = cluster.markers.length > 1;
        const markerClassName = [
          styles.foodMarker,
          getHorizontalMarkerClass(markerX),
          getVerticalMarkerClass(markerY, false),
        ].join(" ");

        if (isCluster) {
          return null;
        }

        const marker = cluster.markers[0];

        return (
          <button
            key={cluster.id}
            type="button"
            className={markerClassName}
            style={{
              left: `${markerX * 100}%`,
              top: `${markerY * 100}%`,
            }}
            onClick={() => onMarkerClick(marker.food.menu_id)}
            disabled={isDetailDisabled}
            aria-label={`${marker.label}${marker.scoreText ? ` ${marker.scoreText}` : ""} 상세 보기`}
          >
            <span className={styles.foodMarkerBubble}>
              <span className={`${styles.foodMarkerName} typo-body3`}>{marker.label}</span>
              {marker.scoreText ? (
                <span
                  className={`typo-body2 ${styles.foodMarkerScore} ${getScoreClass(marker.score ?? 0)}`}
                >
                  {marker.scoreText}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}

      {foodMarkerSourcePinClusters.flatMap((cluster) =>
        cluster.markers.map((marker, markerIndex) => {
          const isSourceMarkerOpen = visibleOpenSourceMarkerId === marker.id;
          const sourceMarkerClassName = [
            styles.foodClusterSourceMarker,
            isSourceMarkerOpen ? styles.foodClusterSourceMarkerOpen : "",
            getHorizontalMarkerClass(marker.markerX),
            getVerticalMarkerClass(marker.markerY, false),
          ].join(" ");

          return (
            <div
              key={`source-pin-${cluster.id}-${marker.id}`}
              className={sourceMarkerClassName}
              style={{
                left: `${marker.markerX * 100}%`,
                top: `${marker.markerY * 100}%`,
              }}
            >
              <button
                type="button"
                className={styles.foodClusterSourcePin}
                onClick={() => {
                  setOpenSourceMarkerId((currentId) =>
                    currentId === marker.id ? null : marker.id,
                  );
                }}
                disabled={isDetailDisabled}
                aria-expanded={isSourceMarkerOpen}
                aria-controls={`food-source-marker-${marker.id}`}
                aria-label={`${markerIndex + 1}번 ${marker.label}${
                  marker.scoreText ? ` ${marker.scoreText}` : ""
                } 말풍선 ${isSourceMarkerOpen ? "닫기" : "열기"}`}
              >
                <span className={`${styles.foodClusterSourcePinLabel} typo-body3`}>
                  {markerIndex + 1}
                </span>
              </button>

              {isSourceMarkerOpen ? (
                <button
                  type="button"
                  id={`food-source-marker-${marker.id}`}
                  className={styles.foodClusterSourceBubble}
                  onClick={() => onMarkerClick(marker.food.menu_id)}
                  disabled={isDetailDisabled}
                  aria-label={`${marker.label}${
                    marker.scoreText ? ` ${marker.scoreText}` : ""
                  } 상세 보기`}
                >
                  <span className={styles.foodMarkerBubble}>
                    <span className={`${styles.foodMarkerName} typo-body3`}>{marker.label}</span>
                    {marker.scoreText ? (
                      <span
                        className={`typo-body2 ${styles.foodMarkerScore} ${getScoreClass(marker.score ?? 0)}`}
                      >
                        {marker.scoreText}
                      </span>
                    ) : null}
                  </span>
                </button>
              ) : null}
            </div>
          );
        }),
      )}
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
                    <Skeleton
                      className={`${styles.calories} textNoWrap`}
                      width="28%"
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

function clusterFoodMarkers(
  markers: FoodMarkerItem[],
  imageFeedbackSize: FoodMarkerLayout,
): FoodMarkerCluster[] {
  const markerLayout = getFoodMarkerLayout(imageFeedbackSize);
  const sortedMarkers = [...markers].sort(
    (firstMarker, secondMarker) =>
      firstMarker.markerY - secondMarker.markerY ||
      firstMarker.markerX - secondMarker.markerX ||
      firstMarker.index - secondMarker.index,
  );
  const clusters: FoodMarkerCluster[] = [];

  sortedMarkers.forEach((marker) => {
    const markerRect = getFoodMarkerBubbleRect(marker, markerLayout);
    const overlappingClusterIndexes = clusters.reduce<number[]>((indexes, cluster, index) => {
      if (isFoodMarkerRectOverlapping(markerRect, cluster.rect)) {
        return [...indexes, index];
      }

      return indexes;
    }, []);

    if (overlappingClusterIndexes.length === 0) {
      clusters.push({
        id: marker.id,
        markers: [marker],
        rect: markerRect,
        x: marker.markerX,
        y: marker.markerY,
      });
      return;
    }

    const targetCluster = clusters[overlappingClusterIndexes[0]];

    if (!targetCluster) {
      return;
    }

    targetCluster.markers.push(marker);

    overlappingClusterIndexes
      .slice(1)
      .sort((firstIndex, secondIndex) => secondIndex - firstIndex)
      .forEach((clusterIndex) => {
        const clusterToMerge = clusters[clusterIndex];

        if (!clusterToMerge) {
          return;
        }

        targetCluster.markers.push(...clusterToMerge.markers);
        clusters.splice(clusterIndex, 1);
      });

    updateFoodMarkerCluster(targetCluster, markerLayout);
  });

  return clusters;
}

function updateFoodMarkerCluster(cluster: FoodMarkerCluster, markerLayout: FoodMarkerLayout) {
  cluster.markers.sort((firstMarker, secondMarker) => firstMarker.index - secondMarker.index);
  cluster.x =
    cluster.markers.reduce((sum, marker) => sum + marker.markerX, 0) / cluster.markers.length;
  cluster.y =
    cluster.markers.reduce((sum, marker) => sum + marker.markerY, 0) / cluster.markers.length;
  cluster.rect = cluster.markers
    .map((marker) => getFoodMarkerBubbleRect(marker, markerLayout))
    .reduce(getCombinedFoodMarkerRect);
  cluster.id = getFoodMarkerClusterId(cluster.markers);
}

function getFoodMarkerLayout(imageFeedbackSize: FoodMarkerLayout): FoodMarkerLayout {
  return {
    height:
      imageFeedbackSize.height > 0 ? imageFeedbackSize.height : FOOD_MARKER_FALLBACK_LAYOUT_SIZE,
    width: imageFeedbackSize.width > 0 ? imageFeedbackSize.width : FOOD_MARKER_FALLBACK_LAYOUT_SIZE,
  };
}

function getFoodMarkerBubbleRect(
  marker: FoodMarkerItem,
  markerLayout: FoodMarkerLayout,
): FoodMarkerRect {
  const bubbleSize = getEstimatedFoodMarkerBubbleSize(marker);
  const anchorX = marker.markerX * markerLayout.width;
  const anchorY = marker.markerY * markerLayout.height;
  const horizontalClass = getHorizontalMarkerClass(marker.markerX);
  const verticalClass = getVerticalMarkerClass(marker.markerY, false);
  let left = anchorX - bubbleSize.width / 2;

  if (horizontalClass === styles.foodMarkerAlignStart) {
    left = anchorX - FOOD_MARKER_BUBBLE_SIDE_OFFSET;
  }

  if (horizontalClass === styles.foodMarkerAlignEnd) {
    left = anchorX - bubbleSize.width + FOOD_MARKER_BUBBLE_SIDE_OFFSET;
  }

  const top =
    verticalClass === styles.foodMarkerBelow
      ? anchorY + FOOD_MARKER_BUBBLE_ANCHOR_GAP
      : anchorY - bubbleSize.height - FOOD_MARKER_BUBBLE_ANCHOR_GAP;

  return {
    bottom: top + bubbleSize.height,
    left,
    right: left + bubbleSize.width,
    top,
  };
}

function getEstimatedFoodMarkerBubbleSize(marker: FoodMarkerItem) {
  const scoreWidth = marker.scoreText ? FOOD_MARKER_SCORE_TEXT_WIDTH : 0;
  const contentGap = marker.scoreText ? FOOD_MARKER_BUBBLE_CONTENT_GAP : 0;
  const labelWidth = getEstimatedTextWidth(marker.label);
  const width = Math.min(
    FOOD_MARKER_BUBBLE_MAX_WIDTH,
    Math.max(
      FOOD_MARKER_BUBBLE_MIN_WIDTH,
      labelWidth + scoreWidth + contentGap + FOOD_MARKER_BUBBLE_HORIZONTAL_PADDING,
    ),
  );
  const labelContentWidth = Math.max(
    1,
    width - scoreWidth - contentGap - FOOD_MARKER_BUBBLE_HORIZONTAL_PADDING,
  );
  const lineCount = Math.max(1, Math.ceil(labelWidth / labelContentWidth));
  const height = Math.max(
    FOOD_MARKER_BUBBLE_MIN_HEIGHT,
    lineCount * FOOD_MARKER_BUBBLE_TEXT_LINE_HEIGHT + 20,
  );

  return {
    height,
    width,
  };
}

function getEstimatedTextWidth(text: string) {
  return Array.from(text).reduce((width, character) => {
    if (/\s/.test(character)) {
      return width + 4;
    }

    return width + (character.charCodeAt(0) > 127 ? 14 : 7);
  }, 0);
}

function isFoodMarkerRectOverlapping(firstRect: FoodMarkerRect, secondRect: FoodMarkerRect) {
  return (
    firstRect.left - FOOD_MARKER_CLUSTER_GAP < secondRect.right &&
    firstRect.right + FOOD_MARKER_CLUSTER_GAP > secondRect.left &&
    firstRect.top - FOOD_MARKER_CLUSTER_GAP < secondRect.bottom &&
    firstRect.bottom + FOOD_MARKER_CLUSTER_GAP > secondRect.top
  );
}

function getCombinedFoodMarkerRect(firstRect: FoodMarkerRect, secondRect: FoodMarkerRect) {
  return {
    bottom: Math.max(firstRect.bottom, secondRect.bottom),
    left: Math.min(firstRect.left, secondRect.left),
    right: Math.max(firstRect.right, secondRect.right),
    top: Math.min(firstRect.top, secondRect.top),
  };
}

function getFoodMarkerClusterId(markers: FoodMarkerItem[]) {
  return markers.map((marker) => marker.id).join("__");
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

function getVerticalMarkerClass(y: number, isCluster: boolean) {
  const belowThreshold = isCluster ? 0.42 : 0.18;

  return y < belowThreshold ? styles.foodMarkerBelow : styles.foodMarkerAbove;
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
