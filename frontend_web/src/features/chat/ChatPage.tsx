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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChatMealRecordBottomSheet,
  type ChatMealRecordMenu,
} from "@/features/chat/components/ChatMealRecordBottomSheet";
import { useSendMessageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import {
  useSyncChatMealRecordDeleteMutation,
  useSyncChatMealRecordRegisterMutation,
} from "@/features/chat/hooks/mutations/useSyncChatMealRecordMutation";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/ChatPage.module.css";
import {
  getMealTypeFromChatMealTime,
  getMealTypeFromCurrentTime,
} from "@/features/chat/utils/chatMeal";
import { buildChatMealRecordTransferState } from "@/features/chat/utils/chatMealRecordTransfer";
import {
  getFeedbackResultPath,
  getRecommendDetailPath,
  getRecommendResultPath,
} from "@/features/chat/utils/recommendNavigation";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath } from "@/router/pathHelpers";
import { AppApiError } from "@/shared/api/appApi";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import {
  type ChatHistoryItemResponseDto,
  type ChatRecommendItemResponseDto,
  type FeedbackDto,
  type MealMenuInputMode,
  type MealTime,
  type MealType,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import {
  formatDateDividerText,
  formatDateKey,
  getTodayFormatDateKey,
  parseDate,
} from "@/shared/utils/dateFormat";

const QUICK_CHIP_LIST = ["지금 먹기 좋은 메뉴를 추천해줘"];
const FEEDBACK_GAUGE_VIEWBOX_WIDTH = 220;
const FEEDBACK_GAUGE_VIEWBOX_HEIGHT = 100;
const FEEDBACK_GAUGE_CENTER_X = 110;
const FEEDBACK_GAUGE_CENTER_Y = 95;
const FEEDBACK_GAUGE_RADIUS = 75;
const FEEDBACK_GAUGE_START_ANGLE = 170;
const FEEDBACK_GAUGE_END_ANGLE = 10;
const FEEDBACK_GAUGE_PATH = getFeedbackGaugePath();
const CAMERA_HINT_DISMISSED_STORAGE_KEY = "chat.cameraHintDismissed";
const SCROLL_BOTTOM_THRESHOLD = 24;

type RecordedMenuSummary = {
  menu_id: number;
  menu_name: string;
  recordedCalories: number;
};

type SelectedMealRecordMenu = {
  id: number;
  quantity: number;
  inputMode: MealMenuInputMode;
};

function getIsCameraHintDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(CAMERA_HINT_DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveCameraHintDismissed() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CAMERA_HINT_DISMISSED_STORAGE_KEY, "true");
  } catch {
    // The in-memory state still hides the hint for the current session.
  }
}

export default function ChatPage() {
  const navigate = useNavigate();
  const selectedDateKey = useSelectedDateKey();
  const mainRef = useRef<HTMLElement>(null);
  const isScrolledAwayFromBottomRef = useRef(false);

  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [isAwaitingHistory, setIsAwaitingHistory] = useState(false);
  const [isCameraActionMenuOpen, setIsCameraActionMenuOpen] = useState(false);
  const [isCameraHintDismissed, setIsCameraHintDismissed] = useState(getIsCameraHintDismissed);
  const [isScrolledAwayFromBottom, setIsScrolledAwayFromBottom] = useState(false);
  const [editingMealRecordChat, setEditingMealRecordChat] =
    useState<ChatHistoryItemResponseDto | null>(null);
  const [editingMealType, setEditingMealType] = useState<MealType>(
    getMealTypeFromCurrentTime(new Date()),
  );
  const [editingSelectedMenus, setEditingSelectedMenus] = useState<SelectedMealRecordMenu[]>([]);

  const { data, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { mutateAsync: sendMessageMutation, isPending: isSendPending } = useSendMessageMutation();
  const { mutateAsync: syncMealRecordRegisterMutate, isPending: isMealRegisterPending } =
    useSyncChatMealRecordRegisterMutation();
  const { mutateAsync: syncMealRecordDeleteMutate } = useSyncChatMealRecordDeleteMutation();

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
  const editingMealRecordMenus = useMemo(() => {
    if (editingMealRecordChat === null) {
      return [];
    }

    return getMealRecordMenus(editingMealRecordChat);
  }, [editingMealRecordChat]);

  const hasAnyConversation = chatList.length > 0 || pendingInput !== null;
  const isTypingPending = pendingInput !== null && (isSendPending || isAwaitingHistory);
  const isInputEmpty = inputValue.trim().length === 0;
  const isQuickActionVisible = isInputEmpty && !isInputFocused;
  const isScrollToBottomButtonVisible = hasAnyConversation && isScrolledAwayFromBottom;
  const isFloatingButtonVisible =
    !isInputFocused && (isQuickActionVisible || isScrollToBottomButtonVisible);

  const updateIsScrolledAwayFromBottom = useCallback(() => {
    const main = mainRef.current;

    if (!main) {
      return;
    }

    const distanceToBottom = main.scrollHeight - main.scrollTop - main.clientHeight;
    const isAwayFromBottom = distanceToBottom > SCROLL_BOTTOM_THRESHOLD;
    isScrolledAwayFromBottomRef.current = isAwayFromBottom;
    setIsScrolledAwayFromBottom(isAwayFromBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const main = mainRef.current;

    if (!main) {
      return;
    }

    main.scrollTo({
      top: main.scrollHeight,
      behavior,
    });
  }, []);

  const scrollToBottomAfterLayout = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (typeof window === "undefined") {
        scrollToBottom(behavior);
        return;
      }

      window.requestAnimationFrame(() => {
        scrollToBottom(behavior);
      });
    },
    [scrollToBottom],
  );

  useEffect(() => {
    if (!isQuickActionVisible) {
      setIsCameraActionMenuOpen(false);
    }
  }, [isQuickActionVisible]);

  useEffect(() => {
    if (isScrollToBottomButtonVisible) {
      setIsCameraActionMenuOpen(false);
    }
  }, [isScrollToBottomButtonVisible]);

  useEffect(() => {
    if (!hasAnyConversation) {
      updateIsScrolledAwayFromBottom();
      return;
    }

    const shouldKeepBottom =
      !isHistoryPending || pendingInput !== null || !isScrolledAwayFromBottomRef.current;

    if (!shouldKeepBottom) {
      updateIsScrolledAwayFromBottom();
      return;
    }

    scrollToBottom("auto");
    scrollToBottomAfterLayout("auto");
  }, [
    chatList,
    hasAnyConversation,
    isHistoryPending,
    pendingInput,
    scrollToBottom,
    scrollToBottomAfterLayout,
    updateIsScrolledAwayFromBottom,
  ]);

  useEffect(() => {
    if (!isTypingPending && pendingInput === null) {
      return;
    }

    scrollToBottomAfterLayout("smooth");
  }, [isTypingPending, pendingInput, scrollToBottomAfterLayout]);

  useEffect(() => {
    updateIsScrolledAwayFromBottom();

    const main = mainRef.current;

    if (!main) {
      return;
    }

    main.addEventListener("scroll", updateIsScrolledAwayFromBottom, { passive: true });
    window.addEventListener("resize", updateIsScrolledAwayFromBottom);

    return () => {
      main.removeEventListener("scroll", updateIsScrolledAwayFromBottom);
      window.removeEventListener("resize", updateIsScrolledAwayFromBottom);
    };
  }, [updateIsScrolledAwayFromBottom]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frameId = window.requestAnimationFrame(updateIsScrolledAwayFromBottom);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    hasAnyConversation,
    isInputFocused,
    isQuickActionVisible,
    pendingInput,
    updateIsScrolledAwayFromBottom,
  ]);

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

  const handleBack = () => {
    if (isNativeApp()) {
      navigateBack();
      return;
    }

    navigateBack({ fallbackTo: PATH.HOME });
  };

  const handleToggleCameraActionMenu = () => {
    if (!isQuickActionVisible) {
      return;
    }

    if (!isCameraHintDismissed) {
      setIsCameraHintDismissed(true);
      saveCameraHintDismissed();
    }

    setIsCameraActionMenuOpen((prev) => !prev);
  };

  const handleCloseCameraActionMenu = () => {
    setIsCameraActionMenuOpen(false);
  };

  const handleScrollToBottom = () => {
    handleCloseCameraActionMenu();
    scrollToBottom("smooth");
  };

  const handleNavigateMenuBoardCamera = () => {
    handleCloseCameraActionMenu();
    navigate(PATH.MENU_BOARD_CAMERA, {
      state: {
        autoOpenCamera: true,
      },
    });
  };

  const handleNavigateFoodCamera = () => {
    handleCloseCameraActionMenu();
    navigate(PATH.CHAT_FOOD_CAMERA);
  };

  const handleNavigateDirectMenuRecord = () => {
    const dateKey = getTodayFormatDateKey();
    const mealType = getMealTypeFromCurrentTime(new Date());

    navigate(getMealSearchPath(dateKey, mealType));
  };

  const handleMenuRecordClick = async (meal: ChatHistoryItemResponseDto) => {
    const primaryMenu = getPrimaryMealRecordMenu(meal);

    if (!primaryMenu) {
      return;
    }

    const nextMealRecord = getMergedMealRecordPayload(meal, primaryMenu);

    if (!nextMealRecord.wasAdded) {
      toast.warning("이미 식사 기록에 추가된 메뉴예요.");
      return;
    }

    try {
      await syncMealRecordRegisterMutate({
        date: selectedDateKey,
        chatId: meal.id,
        time: nextMealRecord.time,
        menus: nextMealRecord.menus,
        previousMealRecord: meal.meal_record,
      });

      toast.success(
        meal.meal_record ? "식사 기록에 메뉴를 추가했어요." : "식사 기록이 등록되었어요.",
      );
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  const handleMealRecordEditClick = (meal: ChatHistoryItemResponseDto) => {
    if (!meal.meal_record) {
      return;
    }

    setEditingMealRecordChat(meal);
    setEditingMealType(getMealTypeFromChatMealTime(meal.meal_record.time));
    setEditingSelectedMenus(getMealRecordSelectedMenus(meal));
  };

  const handleMealRecordEditClose = () => {
    setEditingMealRecordChat(null);
    setEditingSelectedMenus([]);
  };

  const handleMealRecordCancelClick = async (meal: ChatHistoryItemResponseDto) => {
    try {
      await syncMealRecordDeleteMutate({
        date: selectedDateKey,
        chatId: meal.id,
        previousMealRecord: meal.meal_record,
      });

      toast.success("식사 기록을 취소했어요.");
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  const handleEditingQuantityChange = (menuId: number, nextQuantity: number) => {
    setEditingSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, quantity: nextQuantity } : menu)),
    );
  };

  const handleEditingInputModeChange = (menuId: number, nextInputMode: MealMenuInputMode) => {
    setEditingSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, inputMode: nextInputMode } : menu)),
    );
  };

  const handleEditingRemoveMenu = (menuId: number) => {
    setEditingSelectedMenus((prev) => prev.filter((menu) => menu.id !== menuId));
  };

  const handleEditingAddMore = () => {
    if (editingMealRecordChat === null) {
      return;
    }
    handleMealRecordEditClose();
    navigate(getMealRecordPath(selectedDateKey, editingMealType), {
      state: buildChatMealRecordTransferState({
        dateKey: selectedDateKey,
        mealType: editingMealType,
        selectedMenus: editingSelectedMenus,
        menus: editingMealRecordMenus,
      }),
    });
  };

  const handleMealRecordEditSubmit = async () => {
    if (editingMealRecordChat === null) {
      return;
    }

    try {
      await syncMealRecordRegisterMutate({
        date: selectedDateKey,
        chatId: editingMealRecordChat.id,
        time: Number(editingMealType) as MealTime,
        menus: editingSelectedMenus,
        previousMealRecord: editingMealRecordChat.meal_record,
      });

      toast.success("식사 기록이 수정되었어요.");
      handleMealRecordEditClose();
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} />

      {isCameraActionMenuOpen && !isScrollToBottomButtonVisible ? (
        <button
          type="button"
          className={styles.floatingCameraBackdrop}
          onClick={handleCloseCameraActionMenu}
          aria-label="촬영 메뉴 닫기"
        />
      ) : null}

      <main ref={mainRef} className={styles.main}>
        {!hasAnyConversation && !isHistoryPending ? <EmptySection /> : null}
        {isHistoryPending && chatList.length === 0 && pendingInput === null ? (
          <ChatHistorySkeleton />
        ) : null}

        {hasAnyConversation ? (
          <div className={styles.chatTimeline}>
            {chatList.map((chatItem, index) => {
              const chatDate = parseDate(chatItem.createdAt);
              const previousItem = chatList[index - 1];
              const previousDate = previousItem ? parseDate(previousItem.createdAt) : null;
              const userImageUrl = getChatItemImageUrl(chatItem);
              const shouldShowDateDivider =
                chatDate !== null &&
                (previousDate === null || formatDateKey(chatDate) !== formatDateKey(previousDate));
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
                    <div className={styles.userMessageContent}>
                      <p className={`${styles.userBubble} typo-body3`}>{chatItem.input_text}</p>
                      {userImageUrl ? (
                        <img
                          src={userImageUrl}
                          alt=""
                          aria-hidden="true"
                          className={styles.userImageBubble}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.assistantMessageGroup}>
                    <p className={`${styles.assistantBubble} typo-body3`}>
                      {chatItem.response_payload.intro_message}
                    </p>

                    {chatItem.response_payload.chat_category === "recommendation" &&
                    chatItem.response_payload.recommendations.length > 0 ? (
                      <RecommendationSection
                        chatId={chatItem.id}
                        recommendations={chatItem.response_payload.recommendations}
                        onMealRecordClick={() => handleMenuRecordClick(chatItem)}
                        isMealRecorded={
                          (chatItem.meal_record != null &&
                            chatItem.meal_record.menu_ids?.includes(
                              chatItem.response_payload.recommendations[0].menu_id,
                            )) ??
                          false
                        }
                      />
                    ) : null}

                    {chatItem.response_payload.chat_category === "feedback" ? (
                      <FeedbackSection
                        chatId={chatItem.id}
                        feedback={chatItem.response_payload.feedback}
                        onMealRecordClick={() => handleMenuRecordClick(chatItem)}
                        isMealRecorded={
                          (chatItem.meal_record != null &&
                            chatItem.meal_record.menu_ids?.includes(
                              chatItem.response_payload.feedback.menus[0].menu_id,
                            )) ??
                          false
                        }
                      />
                    ) : null}

                    {chatItem.meal_record != null && (
                      <MealRecordCard
                        menus={getRecordedMenus(chatItem)}
                        onCancelClick={() => handleMealRecordCancelClick(chatItem)}
                        onEditClick={() => handleMealRecordEditClick(chatItem)}
                      />
                    )}
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

        {isFloatingButtonVisible && (
          <div className={styles.floatingCameraButtonWrapper}>
            <div className={styles.floatingCameraActionContainer}>
              {isCameraActionMenuOpen && !isScrollToBottomButtonVisible ? (
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

              {!isScrollToBottomButtonVisible &&
                !isCameraActionMenuOpen &&
                !isCameraHintDismissed && (
                  <div className={`${styles.fabBubble} typo-caption`}>메뉴 찍기</div>
                )}
              <button
                type="button"
                className={styles.cameraButton}
                onClick={
                  isScrollToBottomButtonVisible
                    ? handleScrollToBottom
                    : handleToggleCameraActionMenu
                }
                aria-label={
                  isScrollToBottomButtonVisible
                    ? "맨 아래로 이동"
                    : isCameraActionMenuOpen
                      ? "촬영 메뉴 닫기"
                      : "촬영 메뉴 열기"
                }
                aria-expanded={isScrollToBottomButtonVisible ? undefined : isCameraActionMenuOpen}
              >
                {isScrollToBottomButtonVisible ? (
                  <ChevronDown size={24} />
                ) : isCameraActionMenuOpen ? (
                  <X size={24} />
                ) : (
                  <Camera size={24} />
                )}
              </button>
            </div>
          </div>
        )}
        <div>
          {!isInputFocused && (
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
        </div>
      </main>

      <footer className={`${styles.footer} ${isInputFocused ? styles.footerKeyboardOpen : ""}`}>
        <ChatInput
          value={inputValue}
          isInputEmpty={isInputEmpty}
          isSendPending={isSendPending}
          onChange={setInputValue}
          onInputFocusChange={setIsInputFocused}
          onDirectMenuRecordClick={handleNavigateDirectMenuRecord}
          onSubmit={handleSubmit}
        />
      </footer>

      <ChatMealRecordBottomSheet
        isOpen={editingMealRecordChat !== null}
        recommendations={editingMealRecordMenus}
        selectedMenus={editingSelectedMenus}
        mealType={editingMealType}
        submitLabel="수정하기"
        isSubmitPending={isMealRegisterPending}
        onMealTypeChange={setEditingMealType}
        onQuantityChange={handleEditingQuantityChange}
        onInputModeChange={handleEditingInputModeChange}
        onRemoveMenu={handleEditingRemoveMenu}
        onAddMore={handleEditingAddMore}
        onClose={handleMealRecordEditClose}
        onSubmit={handleMealRecordEditSubmit}
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
        상황을 자세히 알려주면 추천이 더 정확해져요
      </p>
    </div>
  );
}

function ChatHistorySkeleton() {
  return (
    <SkeletonStatus className={styles.chatTimeline} label="채팅 내역을 불러오는 중입니다.">
      <section className={styles.conversationSection}>
        <div className={styles.dateDivider}>
          <Skeleton width={84} height={24} radius={999} />
        </div>

        <div className={styles.skeletonUserMessageGroup}>
          <Skeleton width={44} height={14} radius={999} />
          <Skeleton width="64%" height={38} radius={999} />
        </div>

        <div className={styles.assistantMessageGroup}>
          <div className={styles.skeletonAssistantBubble}>
            <Skeleton width="92%" height={16} radius={999} />
            <Skeleton width="68%" height={16} radius={999} />
          </div>

          <article className={styles.skeletonRecommendCard}>
            <Skeleton width={42} height={22} radius={4} />
            <Skeleton width="56%" height={24} radius={999} />
            <Skeleton width="88%" height={16} radius={999} />
            <div className={styles.skeletonRecommendMeta}>
              <Skeleton width="44%" height={16} radius={999} />
              <Skeleton width="28%" height={22} radius={999} />
            </div>
          </article>
        </div>
      </section>

      <section className={styles.conversationSection}>
        <div className={styles.skeletonUserMessageGroup}>
          <Skeleton width={44} height={14} radius={999} />
          <Skeleton width="48%" height={38} radius={999} />
        </div>
        <div className={styles.assistantMessageGroup}>
          <div className={styles.skeletonAssistantBubble}>
            <Skeleton width="84%" height={16} radius={999} />
            <Skeleton width="52%" height={16} radius={999} />
          </div>
        </div>
      </section>
    </SkeletonStatus>
  );
}

function ChatInput({
  value,
  isInputEmpty,
  isSendPending,
  onChange,
  onInputFocusChange,
  onDirectMenuRecordClick,
  onSubmit,
}: {
  value: string;
  isInputEmpty: boolean;
  isSendPending: boolean;
  onChange: (value: string) => void;
  onInputFocusChange: (isFocused: boolean) => void;
  onDirectMenuRecordClick: () => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
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

function MealRecordCard({
  menus,
  onCancelClick,
  onEditClick,
}: {
  menus: RecordedMenuSummary[];
  onCancelClick: () => void;
  onEditClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const primaryMenu = menus[0];
  const hasMultipleMenus = menus.length > 1;
  const totalCalories = menus.reduce((sum, menu) => sum + menu.recordedCalories, 0);

  if (!primaryMenu) return null;
  const handleCancelClick = () => {
    setIsOpen(false);
    onCancelClick();
  };

  return (
    <section className={styles.mealRecordCard}>
      <p className={`${styles.textPrimary} typo-title2`}>기록 완료!</p>

      <button
        type="button"
        className={styles.mealRecordSummary}
        onClick={() => {
          if (hasMultipleMenus) {
            setIsOpen((prev) => !prev);
          }
        }}
        disabled={!hasMultipleMenus}
        aria-expanded={hasMultipleMenus ? isOpen : undefined}
      >
        <p className={`${styles.textNormal} typo-title4`}>
          {hasMultipleMenus
            ? `${primaryMenu.menu_name} 외 ${menus.length - 1}개`
            : primaryMenu.menu_name}
        </p>
        <span className={`${styles.recommendCalories} typo-title3`}>
          {formatCalories(totalCalories)} kcal
        </span>
        {hasMultipleMenus ? (
          <ChevronUp
            size={20}
            className={`${styles.mealRecordChevron} ${isOpen ? styles.mealRecordChevronOpen : ""}`}
          />
        ) : null}
      </button>

      {hasMultipleMenus && isOpen ? (
        <div className={styles.mealRecordMenuList}>
          {menus.map((menu) => (
            <div key={menu.menu_id} className={styles.mealRecordMenuItem}>
              <p className={`${styles.textNormal} typo-body4`}>{menu.menu_name}</p>
              <span className={`${styles.textAlternative} typo-body4`}>
                {formatCalories(menu.recordedCalories)} kcal
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.mealRecordAction}>
        <Button
          size="small"
          variant="outlined"
          color="normal"
          interaction="normal"
          onClick={handleCancelClick}
        >
          기록 취소
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          interaction="normal"
          onClick={onEditClick}
        >
          수정하기
        </Button>
      </div>
    </section>
  );
}

function RecommendationSection({
  chatId,
  recommendations,
  onMealRecordClick,
  isMealRecorded,
}: {
  chatId: number;
  recommendations: ChatRecommendItemResponseDto[];
  onMealRecordClick: () => void;
  isMealRecorded: boolean;
}) {
  const navigate = useNavigate();
  const topRecommendation = recommendations[0];
  const remaining = recommendations.slice(1);

  if (!topRecommendation) return null;

  const topBadgeText = topRecommendation.rank ? `${topRecommendation.rank}위` : "추천";

  return (
    <div className={styles.recommendationSection}>
      <article className={`${styles.recommendCard} ${isMealRecorded ? styles.cardSelected : ""}`}>
        <span className={`${styles.rankBadge} typo-label6`}>{topBadgeText}</span>

        <div className={styles.recommendContents}>
          <p className={`${styles.recommendMenuName} typo-title2`}>{topRecommendation.menu_name}</p>
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
                1{topRecommendation.unit_quantity} ({topRecommendation.weight}
                {topRecommendation.unit === 0 ? "g" : "ml"})
              </span>
            </p>
            <span className={`${styles.recommendCalories} typo-title2`}>
              {formatCalories(topRecommendation.calories)} kcal
            </span>
          </div>
          {topRecommendation.data_source === 1 && (
            <div className={styles.dataSourceBadgeWrapper}>
              <DataSourceBadge variant="personal" active={isMealRecorded} />
            </div>
          )}

          <div className={styles.recommendAction}>
            <Button
              size="small"
              onClick={() => {
                onMealRecordClick();
              }}
            >
              식사 기록
              {isMealRecorded ? (
                <Check size={16} className={styles.recommendActionIcon} />
              ) : (
                <Plus size={16} className={styles.recommendActionIcon} />
              )}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                navigate(getRecommendDetailPath(chatId, topRecommendation.menu_id));
              }}
            >
              자세히 보기
              <ChevronRight size={16} className={styles.recommendActionIcon} />
            </Button>
          </div>
        </div>
      </article>

      {remaining.length > 0 ? (
        <button
          type="button"
          className={styles.moreRecommendCard}
          aria-label="추천 목록 더보기"
          onClick={() => navigate(getRecommendResultPath(chatId))}
        >
          <p className={`${styles.moreRecommendTitle} typo-body3`}>
            다른 추천 메뉴도 있어요 (총 {recommendations.length}개)
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

function FeedbackSection({
  chatId,
  feedback,
  onMealRecordClick,
  isMealRecorded,
}: {
  chatId: number;
  feedback: FeedbackDto;
  onMealRecordClick: () => void;
  isMealRecorded: boolean;
}) {
  const [isMenuListOpen, setIsMenuListOpen] = useState(false);
  const primaryMenu = feedback.menus[0];
  const hasMultipleMenus = feedback.menus.length > 1;
  const navigate = useNavigate();

  return (
    <div className={styles.feedbackSection}>
      <article className={`${styles.feedbackCard} ${isMealRecorded ? styles.cardSelected : ""}`}>
        <FeedbackScoreGauge score={feedback.score} />

        <div className={styles.feedbackContents}>
          <div className={styles.feedbackMenuSummary}>
            <p className={`${styles.feedbackMenuTitle} typo-title2`}>
              {hasMultipleMenus
                ? `${primaryMenu.menu_name} 외 ${feedback.menus.length - 1}개`
                : primaryMenu.menu_name}
            </p>

            {hasMultipleMenus ? (
              <button
                type="button"
                className={`${styles.feedbackMenuToggle}`}
                aria-expanded={isMenuListOpen}
                onClick={() => setIsMenuListOpen((prev) => !prev)}
              >
                <p className={`${styles.textAssistive} typo-label4`}>총 칼로리</p>

                <p className={`${styles.feedbackCalories} typo-title3`}>
                  {formatCalories(feedback.total_calories)} kcal
                  <ChevronUp
                    size={20}
                    className={`${styles.feedbackMenuChevron} ${
                      isMenuListOpen ? styles.feedbackMenuChevronOpen : ""
                    }`}
                  />
                </p>
              </button>
            ) : (
              <div className={`${styles.feedbackMenuToggle}`}>
                <p className={`${styles.textAlternative} typo-label4`}>
                  {formatMenuServing(primaryMenu)}
                </p>
                <p className={`${styles.feedbackCalories} typo-title3`}>
                  {formatCalories(primaryMenu.calories)} kcal
                </p>
              </div>
            )}
          </div>

          {hasMultipleMenus && isMenuListOpen ? (
            <ul className={styles.feedbackMenuList}>
              {feedback.menus.map((menu, index) => (
                <li
                  key={`${menu.menu_id}-${menu.input_menu_name}-${index}`}
                  className={styles.feedbackMenuItem}
                >
                  <div>
                    <p className={`${styles.feedbackMenuItemName} typo-body4`}>{menu.menu_name}</p>
                  </div>
                  <span className={`${styles.feedbackMenuItemCalories} typo-body4`}>
                    {formatCalories(menu.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={styles.feedbackAction}>
            <Button
              size="small"
              fullWidth
              onClick={() => {
                onMealRecordClick();
              }}
            >
              식사 기록
              {isMealRecorded ? (
                <Check size={16} className={styles.feedbackActionIcon} />
              ) : (
                <Plus size={16} className={styles.feedbackActionIcon} />
              )}
            </Button>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={() => {
                navigate(getFeedbackResultPath(chatId));
              }}
            >
              자세히 보기
              <ChevronRight size={16} className={styles.feedbackActionIcon} />
            </Button>
          </div>
        </div>
      </article>

      <p className={`${styles.assistantBubble} typo-body3`}>{feedback.feedback_summary}</p>
      <p className={`${styles.assistantBubble} typo-body3`}>{feedback.feedback_reason}</p>
    </div>
  );
}

function FeedbackScoreGauge({ score }: { score: number }) {
  const roundedScore = Math.round(score);
  const safeScore = Math.min(Math.max(roundedScore, 0), 100);
  const characterIcon = "/icons/chat-chart-icon.svg";
  const markerPosition = getFeedbackGaugeMarkerPosition(safeScore);

  return (
    <div className={styles.feedbackScoreGauge} aria-label={`메뉴 추천도 ${safeScore}점`}>
      <div className={styles.feedbackGaugeArc}>
        <svg
          className={styles.feedbackGaugeSvg}
          viewBox={`0 0 ${FEEDBACK_GAUGE_VIEWBOX_WIDTH} ${FEEDBACK_GAUGE_VIEWBOX_HEIGHT}`}
          aria-hidden="true"
        >
          <path className={styles.feedbackGaugeTrack} d={FEEDBACK_GAUGE_PATH} pathLength={100} />
          <path
            className={styles.feedbackGaugeValue}
            d={FEEDBACK_GAUGE_PATH}
            pathLength={100}
            style={{ strokeDasharray: `${safeScore} 100` }}
          />
        </svg>
        <div className={styles.feedbackScoreLabel}>
          <p className={`${styles.feedbackScoreValue} typo-h3`}>{safeScore}점</p>
          <p className={`${styles.feedbackScoreCaption} typo-label4`}>메뉴 추천도</p>
        </div>
        <img
          src={characterIcon}
          alt=""
          aria-hidden="true"
          className={styles.feedbackGaugeCharacter}
          style={{
            left: markerPosition.x,
            top: markerPosition.y,
          }}
        />
      </div>
    </div>
  );
}

function getFeedbackGaugeMarkerPosition(score: number) {
  const angle =
    FEEDBACK_GAUGE_START_ANGLE -
    ((FEEDBACK_GAUGE_START_ANGLE - FEEDBACK_GAUGE_END_ANGLE) * score) / 100;
  const { x, y } = getFeedbackGaugePoint(angle);

  return {
    x: `${(x / FEEDBACK_GAUGE_VIEWBOX_WIDTH) * 100}%`,
    y: `${(y / FEEDBACK_GAUGE_VIEWBOX_HEIGHT) * 100}%`,
  };
}

function getFeedbackGaugePath() {
  const start = getFeedbackGaugePoint(FEEDBACK_GAUGE_START_ANGLE);
  const end = getFeedbackGaugePoint(FEEDBACK_GAUGE_END_ANGLE);

  return `M ${start.x} ${start.y} A ${FEEDBACK_GAUGE_RADIUS} ${FEEDBACK_GAUGE_RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

function getFeedbackGaugePoint(angle: number) {
  const radian = (angle * Math.PI) / 180;

  return {
    x: FEEDBACK_GAUGE_CENTER_X + FEEDBACK_GAUGE_RADIUS * Math.cos(radian),
    y: FEEDBACK_GAUGE_CENTER_Y - FEEDBACK_GAUGE_RADIUS * Math.sin(radian),
  };
}

function getPrimaryMealRecordMenu(chatItem: ChatHistoryItemResponseDto): ChatMealRecordMenu | null {
  if (chatItem.response_payload.chat_category === "recommendation") {
    return chatItem.response_payload.recommendations[0] ?? null;
  }

  return chatItem.response_payload.feedback.menus[0] ?? null;
}

function getChatItemImageUrl(chatItem: ChatHistoryItemResponseDto) {
  const imageUrl = chatItem.image_url ?? chatItem.response_payload.image_url ?? "";

  return imageUrl.trim().length > 0 ? imageUrl : null;
}

function getMergedMealRecordPayload(
  chatItem: ChatHistoryItemResponseDto,
  menu: ChatMealRecordMenu,
) {
  const mealRecord = chatItem.meal_record;
  const menusById = new Map(
    getMealRecordMenus(chatItem).map((recordMenu) => [recordMenu.menu_id, recordMenu]),
  );
  const existingMenuIds = mealRecord?.menu_ids ?? [];
  const menus = existingMenuIds.map((menuId, index) => ({
    id: menuId,
    quantity: mealRecord?.menu_quantities?.[index] ?? menusById.get(menuId)?.weight ?? 1,
    inputMode: mealRecord?.menu_input_modes?.[index] ?? MENU_INPUT_MODE.UNIT,
  }));

  if (existingMenuIds.includes(menu.menu_id)) {
    return {
      time: mealRecord?.time ?? (Number(getMealTypeFromCurrentTime(new Date())) as MealTime),
      menus,
      wasAdded: false,
    };
  }

  return {
    time: mealRecord?.time ?? (Number(getMealTypeFromCurrentTime(new Date())) as MealTime),
    menus: [
      ...menus,
      {
        id: menu.menu_id,
        quantity: menu.weight,
        inputMode: MENU_INPUT_MODE.UNIT,
      },
    ],
    wasAdded: true,
  };
}

function getMealRecordMenus(chatItem: ChatHistoryItemResponseDto): ChatMealRecordMenu[] {
  const menus =
    chatItem.response_payload.chat_category === "recommendation"
      ? chatItem.response_payload.recommendations
      : chatItem.response_payload.feedback.menus;

  return menus.map((menu) => ({
    menu_id: menu.menu_id,
    menu_name: menu.menu_name,
    brand: menu.brand,
    unit: menu.unit,
    weight: menu.weight,
    unit_quantity: menu.unit_quantity,
    calories: menu.calories,
  }));
}

function getMealRecordSelectedMenus(
  chatItem: ChatHistoryItemResponseDto,
): SelectedMealRecordMenu[] {
  const mealRecord = chatItem.meal_record;

  if (!mealRecord) {
    return [];
  }

  const menusById = new Map(getMealRecordMenus(chatItem).map((menu) => [menu.menu_id, menu]));

  return (mealRecord.menu_ids ?? [])
    .map((menuId, index) => {
      const menu = menusById.get(menuId);

      if (!menu) {
        return null;
      }

      return {
        id: menuId,
        quantity: mealRecord.menu_quantities?.[index] ?? menu.weight,
        inputMode: mealRecord.menu_input_modes?.[index] ?? MENU_INPUT_MODE.UNIT,
      };
    })
    .filter((menu): menu is SelectedMealRecordMenu => menu !== null);
}

function getRecordedMenus(chatItem: ChatHistoryItemResponseDto): RecordedMenuSummary[] {
  const mealRecord = chatItem.meal_record;
  const menuIds = mealRecord?.menu_ids ?? [];

  if (menuIds.length === 0) {
    return [];
  }

  const menus = getMealRecordMenus(chatItem);

  return menuIds.reduce<RecordedMenuSummary[]>((acc, menuId, index) => {
    const menu = menus.find((item) => item.menu_id === menuId);

    if (!menu) {
      return acc;
    }

    const recordedQuantity = mealRecord?.menu_quantities?.[index] ?? menu.weight;
    const recordedCalories =
      menu.weight > 0 ? menu.calories * (recordedQuantity / menu.weight) : menu.calories;

    acc.push({
      menu_id: menu.menu_id,
      menu_name: menu.menu_name,
      recordedCalories,
    });

    return acc;
  }, []);
}

// 문자열 날짜를 timestamp 숫자로 변환
function parseDateValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

// 채팅 말풍선 옆에 표시할 시간
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

function formatMenuServing(menu: FeedbackDto["menus"][number]) {
  return `1${menu.unit_quantity} (${formatCalories(menu.weight)}${menu.unit === 0 ? "g" : "ml"})`;
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
