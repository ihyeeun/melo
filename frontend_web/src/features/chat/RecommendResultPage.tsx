import { CheckCircle2Icon, PlusCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ChatMealRecordBottomSheet } from "@/features/chat/components/ChatMealRecordBottomSheet";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import { useChatMealRecordActions } from "@/features/chat/hooks/useChatMealRecordActions";
import { useClearChatDraftOnFlowExit } from "@/features/chat/hooks/useClearChatDraftOnFlowExit";
import { useChatMealDraftStore } from "@/features/chat/stores/chatMealDraft.store";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import {
  getMealTypeFromCurrentTime,
  parseRecommendationServingContext,
} from "@/features/chat/utils/chatMeal";
import { getRecommendDetailPath, getSafeChatId } from "@/features/chat/utils/recommendNavigation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { DEFAULT_MEAL_TYPE } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBackOrFallback } from "@/shared/navigation/backNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import {
  CHAT_TO_MEAL_RECORD_SOURCE,
  type MealRecordTransferPreview,
  type MealRecordTransferState,
} from "@/shared/types/mealRecordTransfer";

export default function RecommendResultPage() {
  useClearChatDraftOnFlowExit();

  const navigate = useNavigate();
  const selectedDateKey = useSelectedDateKey();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const { data, isPending } = useGetChatHistoryQuery();
  const { registerDraft, isPending: isRecordPending, REGISTER_RESULT } = useChatMealRecordActions();
  const { data: profile } = useGetProfileQuery();

  const draft = useChatMealDraftStore((state) =>
    chatId === null ? null : (state.draftsByChatId[chatId] ?? null),
  );
  const committed = useChatMealDraftStore((state) =>
    chatId === null ? null : (state.committedByChatId[chatId] ?? null),
  );
  const ensureDraft = useChatMealDraftStore((state) => state.ensureDraft);
  const setDraftMealType = useChatMealDraftStore((state) => state.setDraftMealType);
  const upsertDraftMenu = useChatMealDraftStore((state) => state.upsertDraftMenu);
  const removeDraftMenu = useChatMealDraftStore((state) => state.removeDraftMenu);

  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return data?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, data?.chat_list]);

  const defaultMealType = useMemo(() => {
    if (!chatItem) {
      return DEFAULT_MEAL_TYPE;
    }

    const chatCreatedAt = new Date(chatItem.createdAt);
    if (Number.isNaN(chatCreatedAt.getTime())) {
      return DEFAULT_MEAL_TYPE;
    }
    return getMealTypeFromCurrentTime(chatCreatedAt);
  }, [chatItem]);

  const selectedMenuIds = useMemo(() => {
    return new Set((draft?.menus ?? []).map((menu) => menu.id));
  }, [draft?.menus]);

  const selectedCount = draft?.menus.length ?? 0;

  useEffect(() => {
    if (chatId === null) {
      navigate(PATH.CHAT, { replace: true });
      return;
    }

    if (isPending) {
      return;
    }

    if (!chatItem || chatItem.response_payload.recommendations.length === 0) {
      navigate(PATH.CHAT, { replace: true });
      return;
    }

    ensureDraft({
      chatId: chatItem.id,
      dateKey: selectedDateKey,
      mealType: defaultMealType,
    });
  }, [chatId, chatItem, defaultMealType, ensureDraft, isPending, navigate, selectedDateKey]);

  const handleToggleMenu = (menuId: number) => {
    if (!chatItem) {
      return;
    }

    ensureDraft({
      chatId: chatItem.id,
      dateKey: selectedDateKey,
      mealType: defaultMealType,
    });

    if (selectedMenuIds.has(menuId)) {
      removeDraftMenu({
        chatId: chatItem.id,
        id: menuId,
      });
      return;
    }

    const recommendation = chatItem.response_payload.recommendations.find(
      (item) => item.menu_id === menuId,
    );
    const defaultConsumedWeight = recommendation
      ? parseRecommendationServingContext(recommendation.amount).baseWeight
      : 1;

    upsertDraftMenu({
      chatId: chatItem.id,
      id: menuId,
      quantity: defaultConsumedWeight,
    });
  };

  const handleSubmit = async () => {
    if (!chatItem) {
      return;
    }

    const hadCommitted = Boolean(committed);
    const result = await registerDraft({
      chatId: chatItem.id,
    });

    if (result === REGISTER_RESULT.SUCCESS) {
      setIsBottomSheetOpen(false);
      toast.success(hadCommitted ? "수정되었어요" : "등록했어요");
      navigate(PATH.CHAT);
      return;
    }

    if (result === REGISTER_RESULT.SKIPPED) {
      toast.warning("기록할 메뉴를 선택해주세요");
      return;
    }

    toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
  };

  const handleNavigateMealRecordAddMore = () => {
    if (!chatItem) {
      return;
    }

    const selectedMenus = draft?.menus ?? [];
    const previewByMenuId = new Map(
      chatItem.response_payload.recommendations.map((recommendation) => [
        recommendation.menu_id,
        recommendation,
      ]),
    );
    const previews: MealRecordTransferPreview[] = selectedMenus.reduce<MealRecordTransferPreview[]>(
      (acc, menu) => {
        const recommendation = previewByMenuId.get(menu.id);
        if (!recommendation) {
          return acc;
        }
        const servingContext = parseRecommendationServingContext(recommendation.amount);

        acc.push({
          id: menu.id,
          name: recommendation.menu,
          brand: recommendation.brand,
          unit_quantity: recommendation.amount,
          calories: recommendation.calories * (menu.quantity / servingContext.baseWeight),
          weight: servingContext.baseWeight,
          unit: servingContext.weightUnit === "ml" ? 1 : 0,
        });
        return acc;
      },
      [],
    );

    const transferState: MealRecordTransferState = {
      source: CHAT_TO_MEAL_RECORD_SOURCE,
      dateKey: selectedDateKey,
      mealType: draft?.mealType ?? defaultMealType,
      menus: selectedMenus,
      previews,
    };

    setIsBottomSheetOpen(false);
    navigate(getMealRecordPath(selectedDateKey, transferState.mealType), {
      state: transferState,
    });
  };

  if (chatId === null) {
    return null;
  }

  if (isPending && !chatItem) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="메뉴 추천 결과"
          onBack={() => navigateBackOrFallback(navigate, PATH.CHAT)}
        />
        <main className={styles.main}>
          <p className={`${styles.loadingText} typo-body4`}>추천 결과를 불러오는 중이에요</p>
        </main>
      </section>
    );
  }

  if (!chatItem || chatItem.response_payload.recommendations.length === 0) {
    return null;
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title="메뉴 추천 결과"
        onBack={() => navigateBackOrFallback(navigate, PATH.CHAT)}
      />

      <main className={styles.main}>
        <section className={styles.content}>
          <div className={styles.intro}>
            <p className={`${styles.introMessage} typo-title2`}>
              <span className={styles.primaryText}>{profile?.nickname ?? ""}</span>님을 위한 메뉴를
              추천해드려요!
            </p>

            <img src="/icons/character-love.svg" className={styles.characterImage} />
          </div>

          <ul className={styles.resultList}>
            {chatItem.response_payload.recommendations.map((item) => {
              const isSelected = selectedMenuIds.has(item.menu_id);

              return (
                <li key={item.menu_id}>
                  <article
                    className={`${styles.resultCard} ${isSelected ? styles.resultCardSelected : ""}`}
                  >
                    <span className={`${styles.rankBadge} typo-label6`}>{item.rank}위</span>

                    <div className={styles.cardBody}>
                      <div className={styles.textGroup}>
                        <div className={styles.titleRow}>
                          <p className={`${styles.menuName} typo-title2`}>{item.menu}</p>

                          <button
                            type="button"
                            className={`${styles.addButton} ${isSelected ? styles.addButtonSelected : ""}`}
                            aria-pressed={isSelected}
                            onClick={() => handleToggleMenu(item.menu_id)}
                          >
                            {isSelected ? <CheckCircle2Icon size={24} /> : <PlusCircle size={24} />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(getRecommendDetailPath(chatItem.id, item.menu_id))
                          }
                        >
                          <p className={`${styles.summary} typo-label4`}>{item.one_line_summary}</p>

                          <div className={styles.metaRow}>
                            {item.brand && (
                              <span className={`${styles.tertiaryText} typo-label4`}>
                                {item.brand}
                              </span>
                            )}
                            <span className={`${styles.secondaryText} typo-label4`}>
                              1{item.amount}
                            </span>
                            <span className={`${styles.calories} typo-title2`}>
                              {formatCalories(item.calories)} kcal
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <Button
          variant="filled"
          size="medium"
          color="primary"
          fullWidth
          state={selectedCount > 0 && !isRecordPending ? "default" : "disabled"}
          disabled={selectedCount === 0 || isRecordPending}
          onClick={() => setIsBottomSheetOpen(true)}
        >
          {selectedCount > 0 ? `${selectedCount}개 기록하기` : "기록할 메뉴를 선택해주세요"}
        </Button>
      </footer>

      <ChatMealRecordBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        recommendations={chatItem.response_payload.recommendations}
        selectedMenus={draft?.menus ?? []}
        mealType={draft?.mealType ?? defaultMealType}
        onMealTypeChange={(mealType) => {
          setDraftMealType({
            chatId: chatItem.id,
            mealType,
          });
        }}
        onQuantityChange={(menuId, quantity) => {
          upsertDraftMenu({
            chatId: chatItem.id,
            id: menuId,
            quantity,
          });
        }}
        onRemoveMenu={(menuId) => {
          removeDraftMenu({
            chatId: chatItem.id,
            id: menuId,
          });
        }}
        onSubmit={handleSubmit}
        isSubmitPending={isRecordPending}
        submitLabel={committed ? "수정하기" : "등록하기"}
        onAddMore={handleNavigateMealRecordAddMore}
      />
    </section>
  );
}

function formatCalories(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}
