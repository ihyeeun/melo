import { useQueries } from "@tanstack/react-query";
import { Camera, Check, ChevronDown, ChevronRight, ChevronUp, Plus, X } from "lucide-react";
import type { FormEvent, KeyboardEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChatMealRecordBottomSheet,
  type ChatMealRecordMenu,
} from "@/features/chat/components/ChatMealRecordBottomSheet";
import { useSendMessageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/ChatPage.module.css";
import { buildDiaryMealRecordRequest } from "@/features/chat/utils/chatDiaryMealRecord";
import {
  getMealTypeFromChatMealTime,
  getMealTypeFromCurrentTime,
} from "@/features/chat/utils/chatMeal";
import { buildChatMealRecordTransferState } from "@/features/chat/utils/chatMealRecordTransfer";
import {
  getFeedbackDetailPath,
  getFeedbackResultPath,
  getRecommendDetailPath,
  getRecommendResultPath,
} from "@/features/chat/utils/recommendNavigation";
import { getDayMeals } from "@/features/home/api/dayMeal";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/queryKey";
import type { DayMealSummary, MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import {
  DELETE_MEAL_RECORD_RESULT,
  useTodayMealRecordDeleteWithRollbackMutation,
  useTodayMealRecordRegisterMutation,
} from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { AppApiError } from "@/shared/api/appApi";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import {
  type ChatHistoryItemResponseDto,
  type ChatRecommendItemResponseDto,
  type ChatRecommendResponseDto,
  type FeedbackDto,
  MEAL_TYPE_OPTIONS,
  type MealServingInputMode,
  type MealTime,
  type MealType,
} from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";
import {
  formatDateDividerText,
  formatDateKey,
  getTodayFormatDateKey,
  parseDate,
  parseDateKey,
} from "@/shared/utils/dateFormat";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

const QUICK_CHIP_LIST = ["지금 먹기 좋은 메뉴를 추천해줘"];
const FEEDBACK_GAUGE_VIEWBOX_WIDTH = 220;
const FEEDBACK_GAUGE_VIEWBOX_HEIGHT = 100;
const FEEDBACK_GAUGE_CENTER_X = 110;
const FEEDBACK_GAUGE_CENTER_Y = 95;
const FEEDBACK_GAUGE_RADIUS = 75;
const FEEDBACK_GAUGE_START_ANGLE = 170;
const FEEDBACK_GAUGE_END_ANGLE = 10;
const FEEDBACK_GAUGE_PATH = getFeedbackGaugePath();
const CAMERA_HINT_DISMISSED_SESSION_KEY = "chat.cameraHintDismissed";
const SCROLL_BOTTOM_THRESHOLD = 24;
const MEAL_TIME_LIST: MealTime[] = [0, 1, 2, 3, 4];

type RecordedMenuSummary = {
  menu_id: number;
  menu_name: string;
  recordedCalories: number;
};

type SelectedMealRecordMenu = {
  id: number;
  quantity: number;
  mode: MealServingInputMode;
};

type MealRecordSnapshot = {
  time: MealTime;
  menu_ids?: number[];
  menu_quantities?: number[];
  menu_modes?: MealServingInputMode[];
};

type MealRecordViewModel = {
  dateKey: string;
  dayMeals: DayMealSummary;
  image?: string;
  time: MealTime;
  menus: ChatMealRecordMenu[];
  selectedMenus: SelectedMealRecordMenu[];
  recordedMenus: RecordedMenuSummary[];
  previousMealRecord: MealRecordSnapshot;
};

type EditingMealRecordContext = {
  dateKey: string;
  dayMeals: DayMealSummary;
  image?: string;
  menus: ChatMealRecordMenu[];
  previousMealRecord: MealRecordSnapshot;
};

function getIsCameraHintDismissedInSession() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(CAMERA_HINT_DISMISSED_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function saveCameraHintDismissedInSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(CAMERA_HINT_DISMISSED_SESSION_KEY, "true");
  } catch {
    // The in-memory state still hides the hint for the current session.
  }
}

export default function ChatPage() {
  const navigate = useNavigate();
  const todayDateKey = getTodayFormatDateKey();
  const mainRef = useRef<HTMLElement>(null);
  const endAnchorRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [isAwaitingHistory, setIsAwaitingHistory] = useState(false);
  const [isCameraActionMenuOpen, setIsCameraActionMenuOpen] = useState(false);
  const [isCameraHintDismissed, setIsCameraHintDismissed] = useState(
    getIsCameraHintDismissedInSession,
  );
  const [isScrolledAwayFromBottom, setIsScrolledAwayFromBottom] = useState(false);
  const [editingMealRecordContext, setEditingMealRecordContext] =
    useState<EditingMealRecordContext | null>(null);
  const [editingMealType, setEditingMealType] = useState<MealType>(
    getMealTypeFromCurrentTime(new Date()),
  );
  const [editingSelectedMenus, setEditingSelectedMenus] = useState<SelectedMealRecordMenu[]>([]);

  const { data, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { mutateAsync: sendMessageMutation, isPending: isSendPending } = useSendMessageMutation();
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isDiaryMealRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const { mutateAsync: deleteDiaryMealRecordMutate } =
    useTodayMealRecordDeleteWithRollbackMutation();

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
  const chatDateKeys = useMemo(() => {
    const dateKeySet = new Set<string>([todayDateKey]);

    chatList.forEach((chatItem) => {
      const dateKey = getChatDateKey(chatItem);

      if (dateKey !== null) {
        dateKeySet.add(dateKey);
      }
    });

    return [...dateKeySet];
  }, [chatList, todayDateKey]);
  const dayMealQueries = useQueries({
    queries: chatDateKeys.map((dateKey) => ({
      queryKey: homeQueryKeys.dayMeals.byDate(dateKey),
      queryFn: () => getDayMeals({ date: dateKey }),
      staleTime: Infinity,
    })),
  });
  const dayMealsByDate = useMemo(() => {
    const dayMeals = new Map<string, DayMealSummary>();

    chatDateKeys.forEach((dateKey, index) => {
      const queryData = dayMealQueries[index]?.data;

      if (queryData) {
        dayMeals.set(dateKey, queryData);
      }
    });

    return dayMeals;
  }, [chatDateKeys, dayMealQueries]);
  const linkedMealRecordTimesByDate = useMemo(() => {
    const linkedTimes = new Map<string, Set<MealTime>>();

    chatList.forEach((chatItem) => {
      const dateKey = getChatDateKey(chatItem);
      const dayMeals = dateKey ? dayMealsByDate.get(dateKey) : undefined;

      if (!dateKey || !dayMeals) {
        return;
      }

      const mealRecord = getChatMealRecordViewModel(chatItem, dayMeals, dateKey);

      if (!mealRecord) {
        return;
      }

      const times = linkedTimes.get(dateKey) ?? new Set<MealTime>();
      times.add(mealRecord.time);
      linkedTimes.set(dateKey, times);
    });

    return linkedTimes;
  }, [chatList, dayMealsByDate]);
  const hasTodayChat = useMemo(
    () => chatList.some((chatItem) => getChatDateKey(chatItem) === todayDateKey),
    [chatList, todayDateKey],
  );
  const standaloneTodayMealRecords = useMemo(() => {
    if (hasTodayChat) {
      return [];
    }

    const todayMeals = dayMealsByDate.get(todayDateKey);

    if (!todayMeals) {
      return [];
    }

    const linkedTimes = linkedMealRecordTimesByDate.get(todayDateKey);

    return getDateMealRecordViewModels(todayMeals, todayDateKey).filter(
      (record) => !linkedTimes?.has(record.time),
    );
  }, [dayMealsByDate, hasTodayChat, linkedMealRecordTimesByDate, todayDateKey]);
  const todayMealQueryIndex = chatDateKeys.indexOf(todayDateKey);
  const isTodayMealPending =
    todayMealQueryIndex >= 0 ? (dayMealQueries[todayMealQueryIndex]?.isPending ?? false) : false;
  const editingMealRecordMenus = editingMealRecordContext?.menus ?? [];

  const hasAnyConversation = chatList.length > 0 || pendingInput !== null;
  const hasTimelineContent = hasAnyConversation || standaloneTodayMealRecords.length > 0;
  const isTypingPending = pendingInput !== null && (isSendPending || isAwaitingHistory);
  const isInputEmpty = inputValue.trim().length === 0;
  const isQuickActionVisible = isInputEmpty && !isInputFocused;
  const isScrollToBottomButtonVisible = hasTimelineContent && isScrolledAwayFromBottom;
  const isFloatingButtonVisible =
    !isInputFocused && (isQuickActionVisible || isScrollToBottomButtonVisible);

  const updateIsScrolledAwayFromBottom = useCallback(() => {
    const main = mainRef.current;

    if (!main) {
      return;
    }

    const distanceToBottom = main.scrollHeight - main.scrollTop - main.clientHeight;
    setIsScrolledAwayFromBottom(distanceToBottom > SCROLL_BOTTOM_THRESHOLD);
  }, []);

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
    endAnchorRef.current?.scrollIntoView({
      behavior: "instant",
      block: "end",
    });

    updateIsScrolledAwayFromBottom();
  }, [chatList, updateIsScrolledAwayFromBottom]);

  useEffect(() => {
    endAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isTypingPending, pendingInput]);

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
    hasTimelineContent,
    isInputFocused,
    isQuickActionVisible,
    pendingInput,
    updateIsScrolledAwayFromBottom,
  ]);

  const sendChatMessage = async (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || isSendPending) return;

    if (!isCameraHintDismissed) {
      setIsCameraHintDismissed(true);
      saveCameraHintDismissedInSession();
    }

    setPendingInput(text);
    setInputValue("");
    setIsAwaitingHistory(true);
    track(EVENT_NAME.AI_COACH_CHAT, { input_length: text.length });

    try {
      const response = await sendMessageMutation({ input: text });
      track(EVENT_NAME.AI_COACH_RESPONSE_SUCCESS, getAiCoachResponseAnalyticsProperties(response));
    } catch (error) {
      track(EVENT_NAME.AI_COACH_RESPONSE_FAIL, {
        reason: resolveErrorMessage(error),
      });
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

    setIsCameraActionMenuOpen((prev) => !prev);
  };

  const handleCloseCameraActionMenu = () => {
    setIsCameraActionMenuOpen(false);
  };

  const handleScrollToBottom = () => {
    handleCloseCameraActionMenu();
    endAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
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

  const handleMenuRecordClick = async (
    meal: ChatHistoryItemResponseDto,
    dateKey: string | null,
    dayMeals: DayMealSummary | undefined,
    mealRecord?: MealRecordViewModel | null,
  ) => {
    const primaryMenu = getPrimaryMealRecordMenu(meal);

    if (!primaryMenu) {
      return;
    }

    if (!dateKey || !dayMeals) {
      toast.warning("식사 기록을 등록할 수 없어요.");
      return;
    }

    const nextMealRecord = getMergedMealRecordPayload(
      meal,
      primaryMenu,
      dayMeals,
      mealRecord?.previousMealRecord,
    );

    if (!nextMealRecord.wasAdded) {
      toast.warning("이미 식사 기록에 추가된 메뉴예요.");
      return;
    }

    const hadMealRecord = getSelectedMenusByTime(dayMeals, nextMealRecord.time).length > 0;

    try {
      await registerDiaryMealRecordMutate(
        buildDiaryMealRecordRequest({
          dateKey,
          mealType: getMealTypeFromChatMealTime(nextMealRecord.time),
          selectedMenus: nextMealRecord.menus,
          image: mealRecord?.image ?? getMealImage(dayMeals, nextMealRecord.time),
        }),
      );
      track(EVENT_NAME.RECOMMEND_MENU_SAVE, {
        menu_name: primaryMenu.menu_name,
        menu_id: primaryMenu.menu_id,
      });

      toast.success(
        hadMealRecord ? "식사 기록에 메뉴를 추가했어요." : "식사 기록이 등록되었어요.",
      );
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  const handleMealRecordEditClick = (mealRecord: MealRecordViewModel) => {
    setEditingMealRecordContext({
      dateKey: mealRecord.dateKey,
      dayMeals: mealRecord.dayMeals,
      image: mealRecord.image,
      menus: mealRecord.menus,
      previousMealRecord: mealRecord.previousMealRecord,
    });
    setEditingMealType(getMealTypeFromChatMealTime(mealRecord.time));
    setEditingSelectedMenus(mealRecord.selectedMenus);
  };

  const handleMealRecordEditClose = () => {
    setEditingMealRecordContext(null);
    setEditingSelectedMenus([]);
  };

  const handlePrimaryMealRecordRemoveClick = async (
    meal: ChatHistoryItemResponseDto,
    mealRecord: MealRecordViewModel | null,
  ) => {
    const primaryMenu = getPrimaryMealRecordMenu(meal);

    if (!mealRecord || !primaryMenu) {
      return;
    }

    const previousMealRecord = mealRecord.previousMealRecord;
    const remainingMenus = getRemainingMealRecordMenus(
      previousMealRecord,
      mealRecord.menus,
      primaryMenu.menu_id,
    );

    if (remainingMenus.length === (previousMealRecord.menu_ids?.length ?? 0)) {
      return;
    }

    if (remainingMenus.length === 0) {
      try {
        const deleteResult = await deleteDiaryMealRecordMutate({
          dateKey: mealRecord.dateKey,
          request: buildDiaryMealRecordRequest({
            dateKey: mealRecord.dateKey,
            mealType: getMealTypeFromChatMealTime(previousMealRecord.time),
            selectedMenus: [],
            image: mealRecord.image,
          }),
          currentMenusByTime: mealRecord.dayMeals.menusByTime,
        });

        if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return;
        }

        toast.success("식사 기록에서 메뉴를 제거했어요.");
      } catch {
        toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    try {
      await registerDiaryMealRecordMutate(
        buildDiaryMealRecordRequest({
          dateKey: mealRecord.dateKey,
          mealType: getMealTypeFromChatMealTime(previousMealRecord.time),
          selectedMenus: remainingMenus,
          image: mealRecord.image,
        }),
      );

      toast.success("식사 기록에서 메뉴를 제거했어요.");
    } catch {
      toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleDiaryMealRecordCancelClick = async (mealRecord: MealRecordViewModel) => {
    try {
      const deleteResult = await deleteDiaryMealRecordMutate({
        dateKey: mealRecord.dateKey,
        request: buildDiaryMealRecordRequest({
          dateKey: mealRecord.dateKey,
          mealType: getMealTypeFromChatMealTime(mealRecord.time),
          selectedMenus: [],
          image: mealRecord.image,
        }),
        currentMenusByTime: mealRecord.dayMeals.menusByTime,
      });

      if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
        toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      toast.success("식사 기록을 취소했어요.");
    } catch {
      toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleEditingQuantityChange = (menuId: number, nextQuantity: number) => {
    setEditingSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, quantity: nextQuantity } : menu)),
    );
  };

  const handleEditingModeChange = (menuId: number, nextMode: MealServingInputMode) => {
    setEditingSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, mode: nextMode } : menu)),
    );
  };

  const handleEditingRemoveMenu = (menuId: number) => {
    setEditingSelectedMenus((prev) => prev.filter((menu) => menu.id !== menuId));
  };

  const handleEditingAddMore = () => {
    if (editingMealRecordContext === null) {
      return;
    }
    handleMealRecordEditClose();
    navigate(getMealRecordPath(editingMealRecordContext.dateKey, editingMealType), {
      state: buildChatMealRecordTransferState({
        dateKey: editingMealRecordContext.dateKey,
        mealType: editingMealType,
        selectedMenus: editingSelectedMenus,
        menus: editingMealRecordMenus,
      }),
    });
  };

  const handleMealRecordEditSubmit = async () => {
    if (editingMealRecordContext === null) {
      return;
    }

    await submitMealRecordEdit();
  };

  const submitMealRecordEdit = async () => {
    if (editingMealRecordContext === null) {
      return;
    }

    const previousMealRecord = editingMealRecordContext.previousMealRecord;
    const previousMealType = getMealTypeFromChatMealTime(previousMealRecord.time);
    const nextTime = Number(editingMealType) as MealTime;
    const nextMenus =
      previousMealRecord.time === nextTime
        ? editingSelectedMenus
        : mergeSelectedMealRecordMenus(
            getSelectedMenusByTime(editingMealRecordContext.dayMeals, nextTime),
            editingSelectedMenus,
          );

    try {
      if (previousMealRecord.time !== nextTime) {
        const deleteResult = await deleteDiaryMealRecordMutate({
          dateKey: editingMealRecordContext.dateKey,
          request: buildDiaryMealRecordRequest({
            dateKey: editingMealRecordContext.dateKey,
            mealType: previousMealType,
            selectedMenus: [],
            image: editingMealRecordContext.image,
          }),
          currentMenusByTime: editingMealRecordContext.dayMeals.menusByTime,
        });

        if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return;
        }
      }

      await registerDiaryMealRecordMutate(
        buildDiaryMealRecordRequest({
          dateKey: editingMealRecordContext.dateKey,
          mealType: editingMealType,
          selectedMenus: nextMenus,
          image:
            previousMealRecord.time === nextTime
              ? editingMealRecordContext.image
              : getMealImage(editingMealRecordContext.dayMeals, nextTime),
        }),
      );

      toast.success("식사 기록이 수정되었어요.");
      handleMealRecordEditClose();
    } catch {
      if (previousMealRecord.time !== nextTime) {
        try {
          await registerDiaryMealRecordMutate(
            buildDiaryMealRecordRequest({
              dateKey: editingMealRecordContext.dateKey,
              mealType: previousMealType,
              selectedMenus: toSelectedMenus(previousMealRecord),
              image: editingMealRecordContext.image,
            }),
          );
        } catch {
          // The user-facing recovery path is to retry after the cache refetch.
        }
      }

      toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
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
        {!hasTimelineContent && !isHistoryPending && !isTodayMealPending ? <EmptySection /> : null}
        {(isHistoryPending || isTodayMealPending) &&
        !hasTimelineContent &&
        pendingInput === null ? (
          <ChatHistorySkeleton />
        ) : null}

        {hasTimelineContent ? (
          <div className={styles.chatTimeline}>
            {chatList.map((chatItem, index) => {
              const chatDate = parseDate(chatItem.createdAt);
              const chatDateKey = chatDate ? formatDateKey(chatDate) : null;
              const chatDayMeals = chatDateKey ? dayMealsByDate.get(chatDateKey) : undefined;
              const mealRecord = chatDateKey
                ? getChatMealRecordViewModel(chatItem, chatDayMeals, chatDateKey)
                : null;
              const unlinkedDateMealRecords =
                chatDateKey &&
                chatDayMeals &&
                isLastChatItemOnDate(chatList, index, chatDateKey)
                  ? getDateMealRecordViewModels(chatDayMeals, chatDateKey).filter(
                      (record) => !linkedMealRecordTimesByDate.get(chatDateKey)?.has(record.time),
                    )
                  : [];
              const primaryMenu = getPrimaryMealRecordMenu(chatItem);
              const primaryMealRecord =
                chatDateKey && primaryMenu
                  ? getMealRecordViewModelByMenuId(
                      chatDayMeals,
                      chatDateKey,
                      primaryMenu.menu_id,
                    )
                  : null;
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
                      <span className={`${styles.dateText} typo-caption4`}>
                        {formatDateDividerText(chatDate)}
                      </span>
                    </div>
                  ) : null}

                  <div className={styles.userMessageGroup}>
                    <p className={`${styles.timeText} typo-caption4`}>
                      {formatChatTime(chatItem.createdAt)}
                    </p>
                    <div className={styles.userMessageContent}>
                      <p className={`${styles.userBubble} typo-body2`}>{chatItem.input_text}</p>
                      {userImageUrl ? (
                        <img
                          src={userImageUrl}
                          alt="사용자가 업로드한 이미지"
                          aria-hidden="true"
                          className={styles.userImageBubble}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.assistantMessageGroup}>
                    <p className={`${styles.assistantBubble} typo-body2`}>
                      {chatItem.response_payload.intro_message}
                    </p>

                    {chatItem.response_payload.chat_category === "recommendation" &&
                    chatItem.response_payload.recommendations.length > 0 ? (
                      <RecommendationSection
                        chatId={chatItem.id}
                        recommendations={chatItem.response_payload.recommendations}
                        onMealRecordClick={() =>
                          handleMenuRecordClick(chatItem, chatDateKey, chatDayMeals, mealRecord)
                        }
                        onMealRecordCancelClick={() =>
                          handlePrimaryMealRecordRemoveClick(chatItem, primaryMealRecord)
                        }
                        isMealRecorded={primaryMealRecord !== null}
                      />
                    ) : null}

                    {chatItem.response_payload.chat_category === "feedback" ? (
                      <FeedbackSection
                        chatId={chatItem.id}
                        feedback={chatItem.response_payload.feedback}
                        onMealRecordClick={() =>
                          handleMenuRecordClick(chatItem, chatDateKey, chatDayMeals, mealRecord)
                        }
                        onMealRecordCancelClick={() =>
                          handlePrimaryMealRecordRemoveClick(chatItem, primaryMealRecord)
                        }
                        isMealRecorded={primaryMealRecord !== null}
                      />
                    ) : null}

                    {mealRecord !== null && (
                      <MealRecordCard
                        menus={mealRecord.recordedMenus}
                        mealRecordTime={mealRecord.time}
                        onCancelClick={() => handleDiaryMealRecordCancelClick(mealRecord)}
                        onEditClick={() => handleMealRecordEditClick(mealRecord)}
                      />
                    )}

                    {unlinkedDateMealRecords.map((dateMealRecord) => (
                      <MealRecordCard
                        key={`date-meal-${dateMealRecord.time}`}
                        menus={dateMealRecord.recordedMenus}
                        mealRecordTime={dateMealRecord.time}
                        onCancelClick={() => handleDiaryMealRecordCancelClick(dateMealRecord)}
                        onEditClick={() => handleMealRecordEditClick(dateMealRecord)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {standaloneTodayMealRecords.length > 0 ? (
              <section className={styles.conversationSection}>
                <div className={styles.dateDivider}>
                  <span className={`${styles.dateText} typo-caption4`}>
                    {formatDateDividerText(parseDateKey(todayDateKey))}
                  </span>
                </div>

                <div className={styles.assistantMessageGroup}>
                  {standaloneTodayMealRecords.map((dateMealRecord) => (
                    <MealRecordCard
                      key={`today-meal-${dateMealRecord.time}`}
                      menus={dateMealRecord.recordedMenus}
                      mealRecordTime={dateMealRecord.time}
                      onCancelClick={() => handleDiaryMealRecordCancelClick(dateMealRecord)}
                      onEditClick={() => handleMealRecordEditClick(dateMealRecord)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {pendingInput !== null ? (
              <section className={styles.conversationSection} aria-live="polite">
                <div className={styles.userMessageGroup}>
                  <p className={`${styles.timeText} typo-caption4`}>{formatChatTime(new Date())}</p>
                  <p className={`${styles.userBubble} typo-body2`}>{pendingInput}</p>
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
                  <div className={`${styles.fabBubble} typo-caption4`}>메뉴 찍기</div>
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
                  <p className="typo-body2">{chip}</p>
                </button>
              ))}
            </section>
          )}
        </div>
        <div ref={endAnchorRef} />
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
        isOpen={editingMealRecordContext !== null}
        recommendations={editingMealRecordMenus}
        selectedMenus={editingSelectedMenus}
        mealType={editingMealType}
        submitLabel="수정하기"
        isSubmitPending={isDiaryMealRegisterPending}
        onMealTypeChange={setEditingMealType}
        onQuantityChange={handleEditingQuantityChange}
        onModeChange={handleEditingModeChange}
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
      <p className={`typo-body1 ${styles.emptyTitle}`}>
        식단 고민,
        <br />
        무엇이든 물어보세요
      </p>
      {/* <p className={`${styles.emptyText} typo-body3`}>
        <CircleAlert size={20} />
        상황을 자세히 알려주면 추천이 더 정확해져요
      </p> */}
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
            className={`${styles.textInput} typo-body2`}
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
          <span className="typo-body2">직접 메뉴 기록하기</span>
        </button>
      </div>
    </div>
  );
}

function MealRecordCard({
  menus,
  mealRecordTime,
  onCancelClick,
  onEditClick,
}: {
  menus: RecordedMenuSummary[];
  mealRecordTime: MealTime;
  onCancelClick: () => void;
  onEditClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const primaryMenu = menus[0];
  const hasMultipleMenus = menus.length > 1;
  const totalCalories = menus.reduce((sum, menu) => sum + menu.recordedCalories, 0);

  const mealType = getMealTypeFromChatMealTime(mealRecordTime);
  const mealTimeLabel =
    MEAL_TYPE_OPTIONS.find((option) => option.key === mealType)?.label ?? "식사";

  if (!primaryMenu) return null;
  const handleCancelClick = () => {
    setIsOpen(false);
    onCancelClick();
  };

  return (
    <section className={styles.mealRecordCard}>
      <p className={`${styles.textPrimary} typo-title2`}>{mealTimeLabel} 기록 완료!</p>

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
        <p className={`${styles.mealRecordSummaryName} ${styles.textNormal} typo-title4`}>
          {hasMultipleMenus
            ? `${primaryMenu.menu_name} 외 ${menus.length - 1}개`
            : primaryMenu.menu_name}
        </p>
        <span
          className={`${styles.mealRecordSummaryCalories} ${styles.recommendCalories} textNoWrap typo-title3`}
        >
          {formatNumberWithMaxOneDecimal(totalCalories)}kcal
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
              <p className={`${styles.mealRecordMenuName} ${styles.textNormal} typo-body3`}>
                {menu.menu_name}
              </p>
              <span
                className={`${styles.mealRecordMenuCalories} ${styles.textAlternative} textNoWrap typo-body3`}
              >
                {formatNumberWithMaxOneDecimal(menu.recordedCalories)}kcal
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
  onMealRecordCancelClick,
  isMealRecorded,
}: {
  chatId: number;
  recommendations: ChatRecommendItemResponseDto[];
  onMealRecordClick: () => void;
  onMealRecordCancelClick: () => void;
  isMealRecorded: boolean;
}) {
  const navigate = useNavigate();
  const topRecommendation = recommendations[0];
  const remaining = recommendations.slice(1);

  if (!topRecommendation) return null;

  const topBadgeText = topRecommendation.rank ? `${topRecommendation.rank}위` : "추천";
  const handleRecommendationDetailClick = () => {
    navigate(getRecommendDetailPath(chatId, topRecommendation.menu_id));
  };

  const handleRecommendationCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    handleRecommendationDetailClick();
  };

  const handleRecommendationCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleRecommendationDetailClick();
  };

  const handleMealRecordToggleClick = () => {
    if (isMealRecorded) {
      onMealRecordCancelClick();
      return;
    }

    onMealRecordClick();
  };

  return (
    <div className={styles.recommendationSection}>
      <article
        className={`${styles.recommendCard} ${isMealRecorded ? styles.cardSelected : ""}`}
        role="button"
        tabIndex={0}
        aria-label="추천 상세 보기"
        onClick={handleRecommendationCardClick}
        onKeyDown={handleRecommendationCardKeyDown}
      >
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
            <span className={`${styles.recommendCalories} textNoWrap typo-title2`}>
              {formatNumberWithMaxOneDecimal(topRecommendation.calories)}kcal
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
              aria-pressed={isMealRecorded}
              onClick={handleMealRecordToggleClick}
            >
              식사 기록
              {isMealRecorded ? (
                <Check size={16} className={styles.recommendActionIcon} />
              ) : (
                <Plus size={16} className={styles.recommendActionIcon} />
              )}
            </Button>
            <Button size="small" variant="outlined" onClick={handleRecommendationDetailClick}>
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
          <p className={`${styles.textNormal} typo-body2`}>
            다른 추천 메뉴도 있어요 (총 {recommendations.length}개)
          </p>
          <p className={`${styles.ActionIcon} typo-label3`}>
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
  onMealRecordCancelClick,
  isMealRecorded,
}: {
  chatId: number;
  feedback: FeedbackDto;
  onMealRecordClick: () => void;
  onMealRecordCancelClick: () => void;
  isMealRecorded: boolean;
}) {
  const [isMenuListOpen, setIsMenuListOpen] = useState(false);
  const primaryMenu = feedback.menus[0];
  const hasMultipleMenus = feedback.menus.length > 1;
  const navigate = useNavigate();

  if (!primaryMenu) return null;

  const handleFeedbackDetailClick = () => {
    if (hasMultipleMenus) {
      navigate(getFeedbackResultPath(chatId));
      return;
    }

    navigate(getFeedbackDetailPath(chatId, primaryMenu.menu_id));
  };

  const handleFeedbackCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    handleFeedbackDetailClick();
  };

  const handleFeedbackCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleFeedbackDetailClick();
  };

  const handleMealRecordToggleClick = () => {
    if (isMealRecorded) {
      onMealRecordCancelClick();
      return;
    }

    onMealRecordClick();
  };

  return (
    <div className={styles.feedbackSection}>
      <article
        className={`${styles.feedbackCard} ${isMealRecorded ? styles.cardSelected : ""}`}
        role="button"
        tabIndex={0}
        aria-label="피드백 상세 보기"
        onClick={handleFeedbackCardClick}
        onKeyDown={handleFeedbackCardKeyDown}
      >
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

                <p className={`${styles.feedbackCalories} textNoWrap typo-title3`}>
                  {formatNumberWithMaxOneDecimal(feedback.total_calories)}kcal
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
                <p className={`${styles.feedbackCalories} textNoWrap typo-title3`}>
                  {formatNumberWithMaxOneDecimal(primaryMenu.calories)}kcal
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
                    <p className={`${styles.feedbackMenuItemName} typo-body3`}>{menu.menu_name}</p>
                  </div>
                  <span className={`${styles.feedbackMenuItemCalories} textNoWrap typo-body3`}>
                    {formatNumberWithMaxOneDecimal(menu.calories)}kcal
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={styles.feedbackAction}>
            <Button
              size="small"
              fullWidth
              aria-pressed={isMealRecorded}
              onClick={handleMealRecordToggleClick}
            >
              식사 기록
              {isMealRecorded ? (
                <Check size={16} className={styles.feedbackActionIcon} />
              ) : (
                <Plus size={16} className={styles.feedbackActionIcon} />
              )}
            </Button>
            <Button size="small" variant="outlined" fullWidth onClick={handleFeedbackDetailClick}>
              자세히 보기
              <ChevronRight size={16} className={styles.feedbackActionIcon} />
            </Button>
          </div>
        </div>
      </article>

      <p className={`${styles.assistantBubble} typo-body2`}>{feedback.feedback_summary}</p>
      <p className={`${styles.assistantBubble} typo-body2`}>{feedback.feedback_reason}</p>
    </div>
  );
}

function isNestedInteractiveTarget(target: EventTarget | null, boundary: HTMLElement) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveElement = target.closest("button, a, input, select, textarea, [role='button']");
  return interactiveElement !== null && interactiveElement !== boundary;
}

function FeedbackScoreGauge({ score }: { score: number }) {
  const roundedScore = Math.round(score);
  const safeScore = Math.min(Math.max(roundedScore, 0), 100);
  const gaugeVisual = getFeedbackGaugeVisual(safeScore);
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
            className={`${styles.feedbackGaugeValue} ${gaugeVisual.valueClassName}`}
            d={FEEDBACK_GAUGE_PATH}
            pathLength={100}
            style={{ strokeDasharray: `${safeScore} 100` }}
          />
        </svg>
        <div className={styles.feedbackScoreLabel}>
          <p className={`${styles.feedbackScoreValue} typo-h2`}>{safeScore}점</p>
          <p className={`${styles.feedbackScoreCaption} typo-body3`}>메뉴 추천도</p>
        </div>
        <img
          src={gaugeVisual.characterIcon}
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

function getFeedbackGaugeVisual(score: number) {
  if (score < 40) {
    return {
      characterIcon: "/icons/face-1.svg",
      valueClassName: styles.feedbackGaugeValueLow,
    };
  }

  if (score < 80) {
    return {
      characterIcon: "/icons/face-2.svg",
      valueClassName: styles.feedbackGaugeValueWarning,
    };
  }

  return {
    characterIcon: "/icons/face-3.svg",
    valueClassName: styles.feedbackGaugeValueNormal,
  };
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

function getChatDateKey(chatItem: ChatHistoryItemResponseDto) {
  const chatDate = parseDate(chatItem.createdAt);

  return chatDate ? formatDateKey(chatDate) : null;
}

function getMergedMealRecordPayload(
  chatItem: ChatHistoryItemResponseDto,
  menu: ChatMealRecordMenu,
  dayMeals: DayMealSummary,
  mealRecord?: MealRecordSnapshot,
): {
  time: MealTime;
  menus: SelectedMealRecordMenu[];
  wasAdded: boolean;
} {
  const time = mealRecord?.time ?? getFallbackMealRecordTime(chatItem);
  const menus = mealRecord ? toSelectedMenus(mealRecord) : getSelectedMenusByTime(dayMeals, time);
  const existingMenuIds = menus.map((recordedMenu) => recordedMenu.id);

  if (existingMenuIds.includes(menu.menu_id)) {
    return {
      time,
      menus,
      wasAdded: false,
    };
  }

  return {
    time,
    menus: [
      ...menus,
      {
        id: menu.menu_id,
        quantity: menu.weight,
        mode: "unit",
      },
    ],
    wasAdded: true,
  };
}

function getRemainingMealRecordMenus(
  mealRecord: MealRecordSnapshot,
  menus: ChatMealRecordMenu[],
  removeMenuId: number,
): SelectedMealRecordMenu[] {
  const menusById = new Map(menus.map((menu) => [menu.menu_id, menu]));

  return (mealRecord.menu_ids ?? []).flatMap((menuId, index) => {
    if (menuId === removeMenuId) {
      return [];
    }

    return [
      {
        id: menuId,
        quantity: mealRecord.menu_quantities?.[index] ?? menusById.get(menuId)?.weight ?? 1,
        mode: mealRecord.menu_modes?.[index] ?? "unit",
      },
    ];
  });
}

function getFallbackMealRecordTime(chatItem: ChatHistoryItemResponseDto): MealTime {
  const chatDate = parseDate(chatItem.createdAt);

  return Number(getMealTypeFromCurrentTime(chatDate ?? new Date())) as MealTime;
}

function getChatMealRecordViewModel(
  chatItem: ChatHistoryItemResponseDto,
  dayMeals: DayMealSummary | undefined,
  dateKey: string,
) {
  if (!dayMeals) {
    return null;
  }

  const primaryMenu = getPrimaryMealRecordMenu(chatItem);

  return primaryMenu
    ? getMealRecordViewModelByMenuId(dayMeals, dateKey, primaryMenu.menu_id)
    : null;
}

function getMealRecordViewModelByMenuId(
  dayMeals: DayMealSummary | undefined,
  dateKey: string,
  menuId: number,
) {
  if (!dayMeals) {
    return null;
  }

  for (const mealTime of MEAL_TIME_LIST) {
    const menus = dayMeals.menusByTime[mealTime];

    if (menus.some((menu) => menu.id === menuId)) {
      return buildMealRecordViewModel(dateKey, dayMeals, mealTime);
    }
  }

  return null;
}

function getDateMealRecordViewModels(dayMeals: DayMealSummary, dateKey: string) {
  return MEAL_TIME_LIST.flatMap((mealTime) => {
    const mealRecord = buildMealRecordViewModel(dateKey, dayMeals, mealTime);

    return mealRecord ? [mealRecord] : [];
  });
}

function buildMealRecordViewModel(
  dateKey: string,
  dayMeals: DayMealSummary,
  mealTime: MealTime,
): MealRecordViewModel | null {
  const menus = dayMeals.menusByTime[mealTime];

  if (menus.length === 0) {
    return null;
  }

  return {
    dateKey,
    dayMeals,
    image: getMealImage(dayMeals, mealTime),
    time: mealTime,
    menus: menus.map(toChatMealRecordMenu),
    selectedMenus: menus.map(toSelectedMealRecordMenu),
    recordedMenus: menus.map(toRecordedMenuSummary),
    previousMealRecord: {
      time: mealTime,
      menu_ids: menus.map((menu) => menu.id),
      menu_quantities: menus.map((menu) => menu.quantity),
      menu_modes: menus.map((menu) => menu.serving_input_mode),
    },
  };
}

function toChatMealRecordMenu(menu: MenuWithQuantity): ChatMealRecordMenu {
  return {
    menu_id: menu.id,
    menu_name: menu.name,
    brand: menu.brand,
    unit: menu.unit,
    weight: menu.weight,
    unit_quantity: menu.unit_quantity,
    calories: getBaseCalories(menu),
  };
}

function toSelectedMealRecordMenu(menu: MenuWithQuantity): SelectedMealRecordMenu {
  return {
    id: menu.id,
    quantity: menu.quantity,
    mode: menu.serving_input_mode,
  };
}

function getSelectedMenusByTime(dayMeals: DayMealSummary, mealTime: MealTime) {
  return dayMeals.menusByTime[mealTime].map(toSelectedMealRecordMenu);
}

function toSelectedMenus(mealRecord: MealRecordSnapshot): SelectedMealRecordMenu[] {
  return (mealRecord.menu_ids ?? []).map((menuId, index) => ({
    id: menuId,
    quantity: mealRecord.menu_quantities?.[index] ?? 1,
    mode: mealRecord.menu_modes?.[index] ?? "unit",
  }));
}

function mergeSelectedMealRecordMenus(
  baseMenus: SelectedMealRecordMenu[],
  overrideMenus: SelectedMealRecordMenu[],
) {
  const menuById = new Map<number, SelectedMealRecordMenu>();

  baseMenus.forEach((menu) => {
    menuById.set(menu.id, menu);
  });

  overrideMenus.forEach((menu) => {
    menuById.set(menu.id, menu);
  });

  return [...menuById.values()];
}

function toRecordedMenuSummary(menu: MenuWithQuantity): RecordedMenuSummary {
  return {
    menu_id: menu.id,
    menu_name: menu.name,
    recordedCalories: menu.calories,
  };
}

function getBaseCalories(menu: MenuWithQuantity) {
  if (menu.weight > 0 && menu.quantity > 0) {
    return menu.calories * (menu.weight / menu.quantity);
  }

  return menu.calories;
}

function getMealImage(dayMeals: DayMealSummary, mealTime: MealTime) {
  const image = dayMeals.imagesByTime[mealTime];

  return typeof image === "string" && image.trim().length > 0 ? image : undefined;
}

function isLastChatItemOnDate(
  chatList: ChatHistoryItemResponseDto[],
  index: number,
  dateKey: string,
) {
  const nextChatItem = chatList[index + 1];
  return !nextChatItem || getChatDateKey(nextChatItem) !== dateKey;
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

function formatMenuServing(menu: FeedbackDto["menus"][number]) {
  return `1${menu.unit_quantity} (${formatNumberWithMaxOneDecimal(menu.weight)}${menu.unit === 0 ? "g" : "ml"})`;
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

function getAiCoachResponseAnalyticsProperties(response: ChatRecommendResponseDto) {
  if (response.chat_category !== "recommendation") {
    return {
      menu_ids: response.feedback.menus.map((menu) => menu.menu_id),
      menu_names: response.feedback.menus.map((menu) => menu.menu_name),
      has_menu: response.feedback.menus.length > 0,
      chat_mode: "feedback",
    };
  }

  return {
    menu_ids: response.recommendations.map((menu) => menu.menu_id),
    menu_names: response.recommendations.map((menu) => menu.menu_name),
    has_menu: response.recommendations.length > 0,
    chat_mode: "recommendation",
  };
}
