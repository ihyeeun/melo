import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Plus,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ChatMealRecordBottomSheet } from "@/features/chat/components/ChatMealRecordBottomSheet";
import { useSendMessageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import { useChatMealRecordActions } from "@/features/chat/hooks/useChatMealRecordActions";
import { useClearChatDraftOnFlowExit } from "@/features/chat/hooks/useClearChatDraftOnFlowExit";
import { useChatMealDraftStore } from "@/features/chat/stores/chatMealDraft.store";
import styles from "@/features/chat/styles/ChatPage.module.css";
import {
  getMealTypeFromCurrentTime,
  parseRecommendationServingContext,
} from "@/features/chat/utils/chatMeal";
import { getRecommendResultPath } from "@/features/chat/utils/recommendNavigation";
import {
  formatMenuDraftKey,
  useMenuDraftInit,
} from "@/features/meal-record/stores/menuDraft.store";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath, getPathWithMeal } from "@/router/pathHelpers";
import { AppApiError } from "@/shared/api/appApi";
import {
  type ChatHistoryItemResponseDto,
  type ChatRecommendItemResponseDto,
  DEFAULT_MEAL_TYPE,
  type MealType,
} from "@/shared/api/types/api.dto";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import {
  CHAT_TO_MEAL_RECORD_SOURCE,
  type MealRecordTransferPreview,
  type MealRecordTransferState,
} from "@/shared/types/mealRecordTransfer";

const QUICK_CHIP_LIST = ["지금 먹기 좋은 메뉴를 추천해줘"];

type RecordedMenuItem = {
  id: number;
  menu: string;
  totalCalories: number;
};

export default function ChatPage() {
  useClearChatDraftOnFlowExit();

  const navigate = useNavigate();
  const selectedDateKey = useSelectedDateKey();
  const endAnchorRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [isAwaitingHistory, setIsAwaitingHistory] = useState(false);
  const [expandedCompleteCardByChatId, setExpandedCompleteCardByChatId] = useState<
    Record<number, boolean>
  >({});
  const [activeSheetChatId, setActiveSheetChatId] = useState<number | null>(null);
  const [sheetMenus, setSheetMenus] = useState<Array<{ id: number; quantity: number }>>([]);
  const [sheetMealType, setSheetMealType] = useState<MealType>(DEFAULT_MEAL_TYPE);
  const [cancelTargetChatId, setCancelTargetChatId] = useState<number | null>(null);
  const [isCameraActionMenuOpen, setIsCameraActionMenuOpen] = useState(false);

  const committedByChatId = useChatMealDraftStore((state) => state.committedByChatId);
  const ensureDraft = useChatMealDraftStore((state) => state.ensureDraft);
  const setDraftMenus = useChatMealDraftStore((state) => state.setDraftMenus);
  const setDraftMealType = useChatMealDraftStore((state) => state.setDraftMealType);
  const initMenuDraft = useMenuDraftInit();

  const {
    registerDraft,
    cancelCommitted,
    isPending: isRecordPending,
    REGISTER_RESULT,
  } = useChatMealRecordActions();

  const { data, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { mutateAsync: sendMessageMutation, isPending: isSendPending } = useSendMessageMutation();

  const chatList = useMemo(() => {
    const rawList = data?.chat_list ?? [];
    return [...rawList].sort((a, b) => {
      const aTime = parseDateValue(a.createdAt);
      const bTime = parseDateValue(b.createdAt);

      if (aTime !== null && bTime !== null && aTime !== bTime) {
        return aTime - bTime;
      }

      if (aTime === null && bTime !== null) return -1;
      if (aTime !== null && bTime === null) return 1;
      return a.id - b.id;
    });
  }, [data]);

  const hasAnyConversation = chatList.length > 0 || pendingInput !== null;
  const isTypingPending = pendingInput !== null && (isSendPending || isAwaitingHistory);
  const isInputEmpty = inputValue.trim().length === 0;
  const isQuickActionVisible = isInputEmpty && !isInputFocused;

  const activeSheetChatItem = useMemo(() => {
    if (activeSheetChatId === null) {
      return null;
    }

    return chatList.find((item) => item.id === activeSheetChatId) ?? null;
  }, [activeSheetChatId, chatList]);

  const activeSheetCommitted = useMemo(() => {
    if (activeSheetChatId === null) {
      return null;
    }

    return committedByChatId[activeSheetChatId] ?? null;
  }, [activeSheetChatId, committedByChatId]);

  useEffect(() => {
    if (!isQuickActionVisible) {
      setIsCameraActionMenuOpen(false);
    }
  }, [isQuickActionVisible]);

  useEffect(() => {
    endAnchorRef.current?.scrollIntoView({
      behavior: "instant",
      block: "end",
    });
  }, [chatList]);

  useEffect(() => {
    endAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isTypingPending, pendingInput]);

  const sendChatMessage = async (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || isSendPending) return;

    setPendingInput(text);
    setInputValue("");
    setIsAwaitingHistory(true);

    try {
      await sendMessageMutation({ input: text });
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
      setInputValue(text);
    } finally {
      setPendingInput(null);
      setIsAwaitingHistory(false);
    }
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    await sendChatMessage(inputValue);
  };

  const handleToggleCompleteExpanded = (chatId: number) => {
    setExpandedCompleteCardByChatId((prev) => ({
      ...prev,
      [chatId]: !prev[chatId],
    }));
  };

  const handleOpenBottomSheet = (
    chatItem: ChatHistoryItemResponseDto,
    options?: { fromCommitted?: boolean; initialMenuId?: number },
  ) => {
    const fromCommitted = options?.fromCommitted ?? false;
    const initialMenuId = options?.initialMenuId;
    const committed = committedByChatId[chatItem.id];
    const chatCreatedAt = parseDate(chatItem.createdAt) ?? new Date();
    const defaultMealType = getMealTypeFromCurrentTime(chatCreatedAt);

    const baseMealType = fromCommitted && committed ? committed.mealType : defaultMealType;
    const quantityByMenuId = new Map<number, number>();
    const recommendationById = new Map(
      chatItem.response_payload.recommendations.map((recommendation) => [
        recommendation.menu_id,
        recommendation,
      ]),
    );

    if (fromCommitted && committed) {
      committed.menus.forEach((menu) => {
        quantityByMenuId.set(menu.id, menu.quantity);
      });
    }

    if (typeof initialMenuId === "number" && Number.isInteger(initialMenuId) && initialMenuId > 0) {
      if (!quantityByMenuId.has(initialMenuId)) {
        const recommendation = recommendationById.get(initialMenuId);
        const defaultConsumedWeight = recommendation
          ? parseRecommendationServingContext(recommendation.amount).baseWeight
          : 1;
        quantityByMenuId.set(initialMenuId, defaultConsumedWeight);
      }
    }

    setSheetMealType(baseMealType);
    setSheetMenus(
      [...quantityByMenuId.entries()].map(([id, quantity]) => ({
        id,
        quantity,
      })),
    );
    setActiveSheetChatId(chatItem.id);
  };

  const handleBottomSheetSubmit = async () => {
    if (!activeSheetChatItem) {
      return;
    }

    ensureDraft({
      chatId: activeSheetChatItem.id,
      dateKey: selectedDateKey,
      mealType: sheetMealType,
    });

    setDraftMealType({
      chatId: activeSheetChatItem.id,
      mealType: sheetMealType,
    });

    setDraftMenus({
      chatId: activeSheetChatItem.id,
      menus: sheetMenus,
    });

    const hadCommitted = Boolean(activeSheetCommitted);
    const result = await registerDraft({
      chatId: activeSheetChatItem.id,
    });

    if (result === REGISTER_RESULT.SUCCESS) {
      setActiveSheetChatId(null);
      setSheetMenus([]);
      toast.success(hadCommitted ? "수정되었어요" : "등록했어요");
      return;
    }

    if (result === REGISTER_RESULT.SKIPPED) {
      toast.warning("기록할 메뉴를 선택해주세요");
      return;
    }

    toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
  };

  const handleRecordCancel = async (chatId: number) => {
    const result = await cancelCommitted(chatId);

    if (result === REGISTER_RESULT.SUCCESS) {
      toast.success("기록이 취소되었어요");
      return;
    }

    if (result === REGISTER_RESULT.FAILED) {
      toast.warning("기록 취소에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleRecordCancelRequest = (chatId: number) => {
    setCancelTargetChatId(chatId);
  };

  const handleCancelConfirmOpenChange = (open: boolean) => {
    if (!open) {
      setCancelTargetChatId(null);
    }
  };

  const handleRecordCancelConfirm = async () => {
    if (cancelTargetChatId === null) {
      return;
    }

    await handleRecordCancel(cancelTargetChatId);
  };

  const handleCloseBottomSheet = () => {
    setActiveSheetChatId(null);
    setSheetMenus([]);
  };

  const handleNavigateMealRecordAddMore = () => {
    if (!activeSheetChatItem) {
      return;
    }

    const previewByMenuId = new Map(
      activeSheetChatItem.response_payload.recommendations.map((recommendation) => [
        recommendation.menu_id,
        recommendation,
      ]),
    );

    const previews: MealRecordTransferPreview[] = sheetMenus.reduce<MealRecordTransferPreview[]>(
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
      mealType: sheetMealType,
      menus: sheetMenus,
      previews,
    };

    handleCloseBottomSheet();
    navigate(getMealRecordPath(selectedDateKey, sheetMealType), {
      state: transferState,
    });
  };

  const handleNavigateDirectMenuRecord = () => {
    const mealType = getMealTypeFromCurrentTime(new Date());

    initMenuDraft({
      key: formatMenuDraftKey(selectedDateKey, mealType),
      existingMenuCount: 0,
      seedMenus: [],
    });

    navigate(getMealSearchPath(selectedDateKey, mealType));
  };

  const handleToggleCameraActionMenu = () => {
    if (!isQuickActionVisible) {
      return;
    }

    setIsCameraActionMenuOpen((prev) => !prev);
  };

  const handleCloseCameraActionMenu = () => {
    setIsCameraActionMenuOpen(false);
  };

  // TODO 카메라 기능 연동
  const handleNavigateMenuBoardCamera = () => {
    handleCloseCameraActionMenu();
    navigate(PATH.MENU_BOARD_CAMERA, {
      state: {
        autoOpenCamera: true,
      },
    });
  };

  const handleNavigateFoodCamera = () => {
    const mealType = getMealTypeFromCurrentTime(new Date());

    handleCloseCameraActionMenu();
    navigate(getPathWithMeal(PATH.FOOD_CAMERA, selectedDateKey, mealType));
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(PATH.HOME, { replace: true })} />

      {isCameraActionMenuOpen ? (
        <button
          type="button"
          className={styles.floatingCameraBackdrop}
          onClick={handleCloseCameraActionMenu}
          aria-label="촬영 메뉴 닫기"
        />
      ) : null}

      <main className={styles.main}>
        {!hasAnyConversation && !isHistoryPending ? <EmptySection /> : null}
        {isHistoryPending && chatList.length === 0 && pendingInput === null ? (
          <p className={`${styles.loadingText} typo-body4`}>채팅을 불러오는 중이에요</p>
        ) : null}

        {hasAnyConversation ? (
          <div className={styles.chatTimeline}>
            {chatList.map((chatItem, index) => {
              const chatDate = parseDate(chatItem.createdAt);
              const previousItem = chatList[index - 1];
              const previousDate = previousItem ? parseDate(previousItem.createdAt) : null;
              const shouldShowDateDivider =
                chatDate !== null &&
                (previousDate === null || toDateKey(chatDate) !== toDateKey(previousDate));

              const committed = committedByChatId[chatItem.id];
              const selectedMenuIds = (committed?.menus ?? []).map((menu) => menu.id);
              const recordedMenus = committed
                ? buildRecordedMenus(chatItem.response_payload.recommendations, committed.menus)
                : [];

              const isCompleteCardExpanded = expandedCompleteCardByChatId[chatItem.id] ?? false;
              return (
                <section key={chatItem.id} className={styles.conversationSection}>
                  {shouldShowDateDivider ? (
                    <div className={styles.dateDivider}>
                      <span className={`${styles.dateText} typo-caption`}>
                        {formatDateDividerText(chatDate)}
                      </span>
                    </div>
                  ) : null}

                  <div className={styles.userMessageGroup}>
                    <p className={`${styles.timeText} typo-caption`}>
                      {formatChatTime(chatItem.createdAt)}
                    </p>
                    <p className={`${styles.userBubble} typo-body3`}>{chatItem.input_text}</p>
                  </div>

                  <div className={styles.assistantMessageGroup}>
                    <p className={`${styles.assistantBubble} typo-body3`}>
                      {chatItem.response_payload.intro_message}
                    </p>

                    {chatItem.response_payload.recommendations.length > 0 ? (
                      <RecommendationSection
                        chatId={chatItem.id}
                        recommendations={chatItem.response_payload.recommendations}
                        selectedMenuIds={selectedMenuIds}
                        onSelectMenu={(menuId) =>
                          handleOpenBottomSheet(chatItem, { initialMenuId: menuId })
                        }
                        onOpenBottomSheet={() => handleOpenBottomSheet(chatItem)}
                      />
                    ) : null}

                    {recordedMenus.length > 0 ? (
                      <RecordCompleteCard
                        menus={recordedMenus}
                        expanded={isCompleteCardExpanded}
                        onToggleExpanded={() => handleToggleCompleteExpanded(chatItem.id)}
                        onCancel={() => handleRecordCancelRequest(chatItem.id)}
                        onEdit={() => handleOpenBottomSheet(chatItem, { fromCommitted: true })}
                        isActionPending={isRecordPending}
                      />
                    ) : null}
                  </div>
                </section>
              );
            })}

            {pendingInput !== null ? (
              <section className={styles.conversationSection} aria-live="polite">
                <div className={styles.userMessageGroup}>
                  <p className={`${styles.timeText} typo-caption`}>{formatChatTime(new Date())}</p>
                  <p className={`${styles.userBubble} typo-body3`}>{pendingInput}</p>
                </div>

                {isTypingPending ? (
                  <div className={styles.assistantMessageGroup}>
                    <div className={styles.typingBubble} aria-label="답변 생성 중">
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {!isInputFocused && (
          <div
            className={`${styles.floatingCameraButtonWrapper} `}
            aria-hidden={!isQuickActionVisible}
          >
            <div className={styles.floatingCameraActionContainer}>
              {isCameraActionMenuOpen ? (
                <div className={styles.floatingCameraActionList}>
                  <button
                    type="button"
                    className={styles.floatingCameraActionItem}
                    onClick={handleNavigateMenuBoardCamera}
                  >
                    <span className={`${styles.floatingCameraActionLabel} typo-label3`}>
                      메뉴판 찍기
                    </span>
                    <span className={styles.floatingCameraActionIcon}>
                      <img
                        src="/icons/menu.svg"
                        alt=""
                        aria-hidden="true"
                        className={styles.floatingCameraActionIconImage}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.floatingCameraActionItem}
                    onClick={handleNavigateFoodCamera}
                  >
                    <span className={`${styles.floatingCameraActionLabel} typo-label3`}>
                      음식 찍기
                    </span>
                    <span className={styles.floatingCameraActionIcon}>
                      <img
                        src="/icons/food.svg"
                        alt=""
                        aria-hidden="true"
                        className={styles.floatingCameraActionIconImage}
                      />
                    </span>
                  </button>
                </div>
              ) : null}

              {!isCameraActionMenuOpen && (
                <div className={`${styles.fabBubble} typo-caption`}>메뉴 찍기</div>
              )}
              <button
                type="button"
                className={`${styles.cameraButton}`}
                onClick={handleToggleCameraActionMenu}
                aria-label={isCameraActionMenuOpen ? "촬영 메뉴 닫기" : "촬영 메뉴 열기"}
                aria-expanded={isCameraActionMenuOpen}
              >
                {isCameraActionMenuOpen ? <X size={24} /> : <Camera size={24} />}
              </button>
            </div>
          </div>
        )}

        <div ref={endAnchorRef} />
      </main>

      <footer className={styles.footer}>
        {!hasAnyConversation && (
          <section className={`${styles.chipSection}`}>
            {QUICK_CHIP_LIST.map((chip) => (
              <button
                key={chip}
                type="button"
                className={styles.chipContainer}
                onClick={() => sendChatMessage(chip)}
                disabled={isSendPending}
              >
                <p className="typo-body3">{chip}</p>
              </button>
            ))}
          </section>
        )}

        <ChatInput
          value={inputValue}
          isInputEmpty={isInputEmpty}
          isInputFocused={isInputFocused}
          isSendPending={isSendPending}
          onChange={setInputValue}
          onInputFocusChange={setIsInputFocused}
          onSubmit={handleSubmit}
          onDirectMenuRecordClick={handleNavigateDirectMenuRecord}
        />
      </footer>

      <ChatMealRecordBottomSheet
        isOpen={activeSheetChatItem !== null}
        onClose={handleCloseBottomSheet}
        recommendations={activeSheetChatItem?.response_payload.recommendations ?? []}
        selectedMenus={sheetMenus}
        mealType={activeSheetChatItem ? sheetMealType : DEFAULT_MEAL_TYPE}
        onMealTypeChange={(mealType) => {
          setSheetMealType(mealType);
        }}
        onQuantityChange={(menuId, quantity) => {
          setSheetMenus((prev) => {
            const targetIndex = prev.findIndex((menu) => menu.id === menuId);
            if (targetIndex < 0) {
              return [...prev, { id: menuId, quantity }];
            }

            return prev.map((menu, index) =>
              index === targetIndex ? { ...menu, quantity } : menu,
            );
          });
        }}
        onRemoveMenu={(menuId) => {
          setSheetMenus((prev) => prev.filter((menu) => menu.id !== menuId));
        }}
        onSubmit={handleBottomSheetSubmit}
        isSubmitPending={isRecordPending}
        submitLabel={activeSheetCommitted ? "수정하기" : "등록하기"}
        onAddMore={handleNavigateMealRecordAddMore}
      />

      <ConfirmModal
        open={cancelTargetChatId !== null}
        onOpenChange={handleCancelConfirmOpenChange}
        title="기록 취소"
        description="기록을 취소할까요?"
        confirmText="확인"
        confirmDisabled={isRecordPending}
        onConfirm={handleRecordCancelConfirm}
      />
    </div>
  );
}

function EmptySection() {
  return (
    <div className={styles.emptySection}>
      <img src="/icons/character-cool.svg" />
      <p className={`typo-title1 ${styles.emptyTitle}`}>
        식단 고민,
        <br />
        무엇이든 물어보세요
      </p>
      <p className={`${styles.emptyText} typo-body4`}>
        <CircleAlert size={20} />
        오늘 먹은 메뉴를 기록하면 추천이 더 정확해져요
      </p>
    </div>
  );
}

function ChatInput({
  value,
  isInputEmpty,
  isSendPending,
  onChange,
  onInputFocusChange,
  onSubmit,
  onDirectMenuRecordClick,
}: {
  value: string;
  isInputEmpty: boolean;
  isInputFocused: boolean;
  isSendPending: boolean;
  onChange: (value: string) => void;
  onInputFocusChange: (isFocused: boolean) => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDirectMenuRecordClick: () => void;
}) {
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const isSendDisabled = isInputEmpty || isSendPending;

  const handleInputChange = (nextValue: string) => {
    if (isAddActionOpen && nextValue.trim().length > 0) {
      setIsAddActionOpen(false);
    }
    onChange(nextValue);
  };

  return (
    <div className={styles.chatInputContainer}>
      <form className={styles.textInputContainer} onSubmit={onSubmit}>
        <button
          type="button"
          className={`${styles.plusIconContainer} ${isAddActionOpen ? styles.plusIconContainerActive : ""}`}
          onClick={() => setIsAddActionOpen((prev) => !prev)}
          aria-label={isAddActionOpen ? "추가 기능 닫기" : "추가 기능 열기"}
        >
          <Plus
            size={24}
            className={`${styles.plusIcon} ${isAddActionOpen ? styles.plusIconOpen : ""}`}
          />
        </button>

        <div className={styles.textInputWrapper}>
          <textarea
            rows={1}
            value={value}
            className={`${styles.textInput} typo-body3`}
            placeholder="맥도날드에 왔는데 뭐 먹을까?"
            onChange={(event) => handleInputChange(event.target.value.slice(0, 500))}
            onFocus={() => onInputFocusChange(true)}
            onBlur={() => onInputFocusChange(false)}
            maxLength={500}
            disabled={isSendPending}
          />
          {value.trim() !== "" && (
            <button
              type="submit"
              className={`${styles.sendIconContainer} ${isSendDisabled ? styles.sendIconContainerDisabled : ""}`}
              disabled={isSendDisabled}
              aria-label="메시지 전송"
            >
              <ChevronUp size={24} />
            </button>
          )}
        </div>
      </form>

      <div
        className={`${styles.addActionPanel} ${isAddActionOpen ? styles.addActionPanelVisible : styles.addActionPanelHidden}`}
        aria-hidden={!isAddActionOpen}
      >
        <button
          type="button"
          className={styles.addActionItemButton}
          onClick={onDirectMenuRecordClick}
          disabled={!isAddActionOpen}
        >
          <img src="/icons/search-icon.svg" className={styles.addActionItemIcon} />
          <span className="typo-body3">직접 메뉴 기록하기</span>
        </button>
      </div>
    </div>
  );
}

function RecommendationSection({
  chatId,
  recommendations,
  selectedMenuIds,
  onSelectMenu,
  // onOpenBottomSheet,
}: {
  chatId: number;
  recommendations: ChatRecommendItemResponseDto[];
  selectedMenuIds: number[];
  onSelectMenu: (menuId: number) => void;
  onOpenBottomSheet: () => void;
}) {
  const navigate = useNavigate();
  const topRecommendation = recommendations[0];
  const remaining = recommendations.slice(1);

  if (!topRecommendation) return null;

  const topIsSelected = selectedMenuIds.includes(topRecommendation.menu_id);
  const topBadgeText = topRecommendation.rank ? `${topRecommendation.rank}위` : "추천";

  return (
    <div className={styles.recommendationSection}>
      <button
        type="button"
        className={`${styles.recommendCard} ${topIsSelected ? styles.recommendCardSelected : ""}`}
        onClick={() => onSelectMenu(topRecommendation.menu_id)}
        aria-pressed={topIsSelected}
      >
        <span className={`${styles.rankBadge} typo-label6`}>{topBadgeText}</span>

        <div className={styles.recommendContents}>
          <p className={`${styles.recommendMenuName} typo-title2`}>{topRecommendation.menu}</p>
          <p className={`${styles.recommendSummary} typo-label4`}>
            {topRecommendation.one_line_summary}
          </p>
          <div className={styles.recommendMetaRow}>
            <p className={styles.menuInfoRow}>
              {topRecommendation.brand && (
                <span className={`${styles.recommendBrand} typo-label4`}>
                  {topRecommendation.brand}
                </span>
              )}
              <span className={`${styles.recommendAmount} typo-label4`}>
                1{topRecommendation.amount}
              </span>
            </p>
            <span className={`${styles.recommendCalories} typo-title2`}>
              {formatCalories(topRecommendation.calories)} kcal
            </span>
          </div>
        </div>

        {/* TODO 여기에 개인용 뱃지 추가 */}

        <div className="divider" />

        {!topIsSelected ? (
          <div className={styles.addAction}>
            <span className={`${styles.addActionText} typo-label3`}>식사 기록</span>
            <span>
              <Plus size={20} />
            </span>
          </div>
        ) : (
          <div className={styles.addActionSelected}>
            <span className="typo-label3">식사 기록 완료</span>
            <span>
              <Check size={20} />
            </span>
          </div>
        )}
      </button>

      {remaining.length > 0 ? (
        <button
          type="button"
          className={styles.moreRecommendCard}
          aria-label="추천 목록 더보기"
          onClick={() => navigate(getRecommendResultPath(chatId))}
        >
          <p className={`${styles.moreRecommendTitle} typo-body3`}>
            상위 추천 메뉴 2~{recommendations.length}위(총 {recommendations.length}개)
          </p>
          <p className={`${styles.moreRecommendAction} typo-label3`}>
            더보기
            <ChevronRight size={20} />
          </p>
        </button>
      ) : null}
    </div>
  );
}

function RecordCompleteCard({
  menus,
  expanded,
  onToggleExpanded,
  onCancel,
  onEdit,
  isActionPending,
}: {
  menus: RecordedMenuItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onCancel: () => void;
  onEdit: () => void;
  isActionPending: boolean;
}) {
  const totalCalories = menus.reduce((sum, item) => sum + item.totalCalories, 0);
  const summaryText = getRecordSummaryText(menus);

  return (
    <article className={styles.recordCompleteCard}>
      <p className={`${styles.recordCompleteTitle} typo-title2`}>기록 완료!</p>

      <button
        type="button"
        className={styles.recordCompleteSummaryButton}
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span className={`${styles.recordCompleteSummaryText} typo-title4`}>{summaryText}</span>

        <span className={styles.recordCompleteCaloriesWrapper}>
          <span className={`${styles.recordCompleteCalories} typo-title3`}>
            {formatCalories(totalCalories)} kcal
          </span>
          <ChevronDown
            size={20}
            className={`${styles.recordCompleteChevron} ${expanded ? styles.recordCompleteChevronExpanded : ""}`}
          />
        </span>
      </button>

      {expanded ? (
        <ul className={styles.recordCompleteDetailList}>
          {menus.map((item) => (
            <li key={item.id} className={styles.recordCompleteDetailItem}>
              <span className="typo-body3">{item.menu}</span>
              <span className={`${styles.recordCompleteDetailCalories} typo-body3`}>
                {formatCalories(item.totalCalories)} kcal
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.recordCompleteActionRow}>
        <button
          type="button"
          className={`${styles.recordActionButton} ${styles.recordActionButtonNeutral}`}
          onClick={onCancel}
          disabled={isActionPending}
        >
          기록 취소
        </button>
        <button
          type="button"
          className={`${styles.recordActionButton} ${styles.recordActionButtonPrimary}`}
          onClick={onEdit}
          disabled={isActionPending}
        >
          수정하기
        </button>
      </div>
    </article>
  );
}

function getRecordSummaryText(menus: RecordedMenuItem[]) {
  if (menus.length === 0) return "선택한 메뉴 없음";
  if (menus.length === 1) return menus[0].menu;
  return `${menus[0].menu} 외 ${menus.length - 1}개`;
}

function buildRecordedMenus(
  recommendations: ChatRecommendItemResponseDto[],
  selectedMenus: Array<{ id: number; quantity: number }>,
): RecordedMenuItem[] {
  const recommendationById = new Map(recommendations.map((item) => [item.menu_id, item]));

  return selectedMenus.reduce<RecordedMenuItem[]>((acc, selectedMenu) => {
    const recommendation = recommendationById.get(selectedMenu.id);
    if (!recommendation) {
      return acc;
    }

    acc.push({
      id: selectedMenu.id,
      menu: recommendation.menu,
      totalCalories:
        recommendation.calories *
        (selectedMenu.quantity /
          parseRecommendationServingContext(recommendation.amount).baseWeight),
    });

    return acc;
  }, []);
}

function parseDateValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDividerText(date: Date) {
  const weekday = date.toLocaleDateString("ko-KR", {
    weekday: "long",
  });

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
}

function formatChatTime(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? parseDate(dateLike) : dateLike;
  if (!date) return "시간 미상";
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCalories(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof AppApiError && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "메시지 전송에 실패했어요. 잠시 후 다시 시도해주세요.";
}
