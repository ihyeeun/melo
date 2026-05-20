import { useEffect, useMemo, useState } from "react";

import {
  ChatMealRecordBottomSheet,
  type ChatMealRecordMenu,
} from "@/features/chat/components/ChatMealRecordBottomSheet";
import { useSyncChatMealRecordRegisterMutation } from "@/features/chat/hooks/mutations/useSyncChatMealRecordMutation";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import {
  getMealTypeFromChatMealTime,
  getMealTypeFromCurrentTime,
} from "@/features/chat/utils/chatMeal";
import { buildChatMealRecordTransferState } from "@/features/chat/utils/chatMealRecordTransfer";
import { getRecommendDetailPath, getSafeChatId } from "@/features/chat/utils/recommendNavigation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { AppApiError } from "@/shared/api/appApi";
import {
  type ChatHistoryItemResponseDto,
  type ChatRecommendItemResponseDto,
  type MealMenuInputMode,
  type MealTime,
  type MealType,
  MENU_INPUT_MODE,
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
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

type RecommendFilter = "all" | "brand" | "food";
type SelectedMealRecordMenu = {
  id: number;
  quantity: number;
  inputMode: MealMenuInputMode;
};

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
      key={getMealRecordStateKey(chatItem)}
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
  const selectedDateKey = useSelectedDateKey();
  const [selectedFilter, setSelectedFilter] = useState<RecommendFilter>("all");
  const [selectedMenus, setSelectedMenus] = useState<SelectedMealRecordMenu[]>(() =>
    chatItem.meal_record ? getInitialSelectedMenus(recommendations, chatItem.meal_record) : [],
  );
  const [mealType, setMealType] = useState<MealType>(() =>
    chatItem.meal_record
      ? getMealTypeFromChatMealTime(chatItem.meal_record.time)
      : getMealTypeFromCurrentTime(new Date()),
  );
  const [isMealRecordSheetOpen, setIsMealRecordSheetOpen] = useState(false);
  const { mutateAsync: syncMealRecordRegisterMutate, isPending: isMealRegisterPending } =
    useSyncChatMealRecordRegisterMutation();

  const mealRecordMenus = useMemo(() => {
    return getMealRecordMenus(recommendations);
  }, [recommendations]);
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

  const handleToggleMenu = (menu: ChatRecommendItemResponseDto) => {
    setSelectedMenus((prev) => {
      const isAlreadySelected = prev.some((item) => item.id === menu.menu_id);

      if (isAlreadySelected) {
        return prev.filter((item) => item.id !== menu.menu_id);
      }

      return [
        ...prev,
        {
          id: menu.menu_id,
          quantity: menu.weight,
          inputMode: MENU_INPUT_MODE.UNIT,
        },
      ];
    });
  };

  const handleQuantityChange = (menuId: number, nextQuantity: number) => {
    setSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, quantity: nextQuantity } : menu)),
    );
  };

  const handleInputModeChange = (menuId: number, nextInputMode: MealMenuInputMode) => {
    setSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, inputMode: nextInputMode } : menu)),
    );
  };

  const handleRemoveMenu = (menuId: number) => {
    setSelectedMenus((prev) => prev.filter((menu) => menu.id !== menuId));
  };

  const handleAddMore = () => {
    setIsMealRecordSheetOpen(false);
    navigate(getMealRecordPath(selectedDateKey, mealType), {
      state: buildChatMealRecordTransferState({
        dateKey: selectedDateKey,
        mealType,
        selectedMenus,
        menus: mealRecordMenus,
      }),
    });
  };

  const handleSubmitMealRecord = async () => {
    try {
      await syncMealRecordRegisterMutate({
        date: selectedDateKey,
        chatId: chatItem.id,
        time: Number(mealType) as MealTime,
        menus: selectedMenus,
        previousMealRecord: chatItem.meal_record,
      });
      getSelectedMealRecordMenus(mealRecordMenus, selectedMenus).forEach((menu) => {
        track(EVENT_NAME.RECOMMEND_MENU_SAVE, {
          menu_name: menu.menu_name,
          menu_id: menu.menu_id,
        });
      });

      toast.success(
        chatItem.meal_record ? "식사 기록이 수정되었어요." : "식사 기록이 등록되었어요.",
      );
      setIsMealRecordSheetOpen(false);
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
            <span className={styles.textPrimary}>{profileNickname}</span>님을 위한 메뉴를
            추천해드려요!
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
                    description={item.one_line_summary}
                    calories={item.calories}
                    unit_quantity={item.unit_quantity}
                    brand={item.brand}
                    data_source={item.data_source}
                    weight={item.weight}
                    unit={item.unit}
                    icon={isSelected ? "check" : "add"}
                    state={isSelected ? "select" : "default"}
                    onClick={() => navigate(getRecommendDetailPath(chatItem.id, item.menu_id))}
                    onIconClick={() => handleToggleMenu(item)}
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
          disabled={selectedMenus.length === 0}
          onClick={() => setIsMealRecordSheetOpen(true)}
        >
          {selectedMenus.length}개 {chatItem.meal_record ? "수정하기" : "기록하기"}
        </Button>
      </footer>

      <ChatMealRecordBottomSheet
        isOpen={isMealRecordSheetOpen}
        recommendations={mealRecordMenus}
        selectedMenus={selectedMenus}
        mealType={mealType}
        submitLabel={chatItem.meal_record ? "수정하기" : "담기"}
        isSubmitPending={isMealRegisterPending}
        onMealTypeChange={setMealType}
        onQuantityChange={handleQuantityChange}
        onInputModeChange={handleInputModeChange}
        onRemoveMenu={handleRemoveMenu}
        onAddMore={handleAddMore}
        onClose={() => setIsMealRecordSheetOpen(false)}
        onSubmit={handleSubmitMealRecord}
      />
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
                    <Skeleton className={styles.calories} width="26%" height={22} radius={999} />
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

function getMealRecordMenus(recommendations: ChatRecommendItemResponseDto[]): ChatMealRecordMenu[] {
  return recommendations.map((menu) => ({
    menu_id: menu.menu_id,
    menu_name: menu.menu_name,
    brand: menu.brand,
    unit: menu.unit,
    weight: menu.weight,
    unit_quantity: menu.unit_quantity,
    calories: menu.calories,
  }));
}

function getInitialSelectedMenus(
  recommendations: ChatRecommendItemResponseDto[],
  mealRecord: NonNullable<ChatHistoryItemResponseDto["meal_record"]>,
): SelectedMealRecordMenu[] {
  const recommendationsById = new Map(recommendations.map((menu) => [menu.menu_id, menu]));

  return (mealRecord.menu_ids ?? [])
    .map((menuId, index) => {
      const recommendation = recommendationsById.get(menuId);

      if (!recommendation) {
        return null;
      }

      return {
        id: menuId,
        quantity: mealRecord.menu_quantities?.[index] ?? recommendation.weight,
        inputMode: mealRecord.menu_input_modes?.[index] ?? MENU_INPUT_MODE.UNIT,
      };
    })
    .filter((menu): menu is SelectedMealRecordMenu => menu !== null);
}

function getSelectedMealRecordMenus(
  mealRecordMenus: ChatMealRecordMenu[],
  selectedMenus: SelectedMealRecordMenu[],
) {
  const menusById = new Map(mealRecordMenus.map((menu) => [menu.menu_id, menu]));

  return selectedMenus
    .map((selectedMenu) => menusById.get(selectedMenu.id) ?? null)
    .filter((menu): menu is ChatMealRecordMenu => menu !== null);
}

function getMealRecordStateKey(chatItem: ChatHistoryItemResponseDto) {
  const mealRecord = chatItem.meal_record;

  if (!mealRecord) {
    return `${chatItem.id}:empty`;
  }

  return [
    chatItem.id,
    mealRecord.time,
    mealRecord.menu_ids?.join(",") ?? "",
    mealRecord.menu_quantities?.join(",") ?? "",
    mealRecord.menu_input_modes?.join(",") ?? "",
  ].join(":");
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
