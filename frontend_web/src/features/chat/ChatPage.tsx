import { useActivity } from "@stackflow/react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { FormEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { AssistantMessageText } from "@/features/chat/components/AssistantMessageText";
import { AssistantPendingMessage } from "@/features/chat/components/AssistantPendingMessage";
import {
  ChatMealRecordBottomSheet,
  type ChatMealRecordMenu,
} from "@/features/chat/components/ChatMealRecordBottomSheet";
import { useSendMessageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import {
  ChatHistorySyncError,
  refetchAndResolveChatHistoryItem,
} from "@/features/chat/hooks/queries/chatHistoryCache";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import {
  useChatMealRecordFocusRequest,
  useClearChatMealRecordFocusRequest,
} from "@/features/chat/stores/mealRecordFocus.store";
import styles from "@/features/chat/styles/ChatPage.module.css";
import {
  buildDiaryMealRecordRequest,
  getCurrentMealTime,
  getDiaryMealImage,
  getNextDiaryMenusByCandidateIds,
  getSelectedDiaryMenusByTime,
  getSelectedDiaryMenusFromCandidateMenus,
  type SelectedDiaryMealRecordMenu,
} from "@/features/chat/utils/chatDiaryMealRecord";
import { isChatHistoryItemResponse } from "@/features/chat/utils/chatHistoryItem";
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
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  DELETE_MEAL_RECORD_RESULT,
  useTodayMealRecordDeleteWithRollbackMutation,
  useTodayMealRecordRegisterMutation,
} from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { trackRecommendMenuSave } from "@/shared/analytics/recommendMenuEvents";
import { AppApiError } from "@/shared/api/appApi";
import { isNativeApp, requestNativeAppDeviceInfo } from "@/shared/api/bridge/nativeBridge";
import type { AppDeviceInfoPayload } from "@/shared/api/bridge/nativeBridge.types";
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
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";
import {
  formatDateDividerText,
  formatDateKey,
  formatDateKeyToMonthDayWeekdayLabel,
  formatTimeText,
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
const SOFT_KEYBOARD_VISIBLE_HEIGHT_THRESHOLD = 120;
const MEAL_TIME_LIST: MealTime[] = [0, 1, 2, 3, 4];
const ASSISTANT_BUBBLE_REVEAL_START_DELAY_MS = 180;
const ASSISTANT_BUBBLE_GAP_MS = 1000;
const ASSISTANT_RESULT_REVEAL_DELAY_MS = 520;
const ASSISTANT_RESULT_CARD_GAP_MS = 460;

type RecordedMenuSummary = {
  menu_id: number;
  menu_name: string;
  recordedCalories: number;
};

type MealRecordSnapshot = {
  time: MealTime;
  menus: SelectedDiaryMealRecordMenu[];
};

type MealRecordViewModel = {
  dateKey: string;
  dayMeals: DayMealSummary;
  image?: string;
  time: MealTime;
  createdAt?: string;
  updatedAt?: string;
  menus: ChatMealRecordMenu[];
  recordedMenus: RecordedMenuSummary[];
  previousMealRecord: MealRecordSnapshot;
};

type ChatTimelineItem =
  | {
      type: "chat";
      key: string;
      date: Date | null;
      sortTime: number | null;
      chatItem: ChatHistoryItemResponseDto;
    }
  | {
      type: "mealRecord";
      key: string;
      date: Date | null;
      sortTime: number | null;
      mealRecord: MealRecordViewModel;
    };

type EditingMealRecordContext = {
  dateKey: string;
  dayMeals: DayMealSummary;
  image?: string;
  menus: ChatMealRecordMenu[];
  previousMealRecord: MealRecordSnapshot;
};

type MealRecordCancelTarget =
  | {
      type: "chatMenus";
      chatItem: ChatHistoryItemResponseDto;
      mealRecord: MealRecordViewModel;
    }
  | {
      type: "mealRecord";
      mealRecord: MealRecordViewModel;
    };

type TimelineScrollTarget = {
  block: ScrollLogicalPosition;
  key: string;
  requestId: number;
};

type AssistantPlaybackState = {
  chatItemId: number;
  visibleBubbleCount: number;
  resultVisibleCount: number;
};

type ClientOsName = AppDeviceInfoPayload["osName"] | "unknown";

function getUserAgentOsName(): ClientOsName {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const { maxTouchPoints, platform, userAgent } = window.navigator;

  if (/Android/i.test(userAgent)) {
    return "android";
  }

  if (/iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) {
    return "ios";
  }

  return "unknown";
}

function useClientOsName() {
  const [clientOsName, setClientOsName] = useState<ClientOsName>(getUserAgentOsName);

  useEffect(() => {
    let isActive = true;

    if (!isNativeApp()) {
      return () => {
        isActive = false;
      };
    }

    void requestNativeAppDeviceInfo()
      .then((deviceInfo) => {
        if (!isActive) return;
        setClientOsName(deviceInfo.osName);
      })
      .catch(() => {
        // Keep the user-agent fallback when the app bridge cannot return device info.
      });

    return () => {
      isActive = false;
    };
  }, []);

  return clientOsName;
}

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

type UseEnsureBottomOnQuickActionParams = {
  isTop: boolean;
  isQuickActionVisible: boolean;
  isScrolledAwayFromBottom: boolean;
  pendingMealRecordScrollKeyRef: Readonly<{ current: string | null }>;
  timelineScrollTarget: TimelineScrollTarget | null;
  endAnchorRef: Readonly<{ current: HTMLDivElement | null }>;
  updateIsScrolledAwayFromBottom: () => void;
};

function useEnsureBottomOnQuickAction({
  isTop,
  isQuickActionVisible,
  isScrolledAwayFromBottom,
  pendingMealRecordScrollKeyRef,
  timelineScrollTarget,
  endAnchorRef,
  updateIsScrolledAwayFromBottom,
}: UseEnsureBottomOnQuickActionParams) {
  const wasQuickActionVisibleRef = useRef(false);

  useEffect(() => {
    const becameQuickActionVisible =
      isTop && isQuickActionVisible && !wasQuickActionVisibleRef.current;
    wasQuickActionVisibleRef.current = isQuickActionVisible;

    if (
      !isTop ||
      !becameQuickActionVisible ||
      isScrolledAwayFromBottom ||
      pendingMealRecordScrollKeyRef.current !== null ||
      timelineScrollTarget !== null ||
      typeof window === "undefined"
    ) {
      return;
    }

    const alignBottom = () => {
      endAnchorRef.current?.scrollIntoView({
        behavior: "instant",
        block: "end",
      });
      updateIsScrolledAwayFromBottom();
    };

    const frameId = window.requestAnimationFrame(alignBottom);
    const timeoutId = window.setTimeout(alignBottom, 180);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [
    endAnchorRef,
    isTop,
    isQuickActionVisible,
    isScrolledAwayFromBottom,
    pendingMealRecordScrollKeyRef,
    timelineScrollTarget,
    updateIsScrolledAwayFromBottom,
  ]);
}

function useSoftKeyboardVisible(isInputFocused: boolean, clientOsName: ClientOsName) {
  const [isVisible, setIsVisible] = useState(false);
  const baselineViewportHeightRef = useRef<number | null>(null);
  const lastViewportWidthRef = useRef<number | null>(null);

  useEffect(() => {
    if (clientOsName === "ios") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const isAndroid = clientOsName === "android";
    const viewport = window.visualViewport;
    const getViewportHeight = () => viewport?.height ?? window.innerHeight;
    const getViewportWidth = () => viewport?.width ?? window.innerWidth;

    const updateBaselineViewport = (currentHeight: number, currentWidth: number) => {
      if (lastViewportWidthRef.current !== null && lastViewportWidthRef.current !== currentWidth) {
        baselineViewportHeightRef.current = null;
      }

      lastViewportWidthRef.current = currentWidth;

      if (
        baselineViewportHeightRef.current === null ||
        currentHeight > baselineViewportHeightRef.current
      ) {
        baselineViewportHeightRef.current = currentHeight;
      }
    };

    const updateKeyboardVisibility = () => {
      const currentHeight = getViewportHeight();
      const currentWidth = getViewportWidth();

      updateBaselineViewport(currentHeight, currentWidth);

      if (isAndroid) {
        if (baselineViewportHeightRef.current === null) {
          setIsVisible(isInputFocused);
          return;
        }

        const keyboardHeight = baselineViewportHeightRef.current - currentHeight;
        setIsVisible(keyboardHeight > SOFT_KEYBOARD_VISIBLE_HEIGHT_THRESHOLD);
        return;
      }

      if (!isInputFocused) {
        setIsVisible(false);
        return;
      }

      if (baselineViewportHeightRef.current === null) {
        setIsVisible(false);
        return;
      }

      const keyboardHeight = baselineViewportHeightRef.current - currentHeight;
      const nextIsVisible = keyboardHeight > SOFT_KEYBOARD_VISIBLE_HEIGHT_THRESHOLD;

      setIsVisible(nextIsVisible);
    };

    updateKeyboardVisibility();

    viewport?.addEventListener("resize", updateKeyboardVisibility);
    viewport?.addEventListener("scroll", updateKeyboardVisibility);
    window.addEventListener("resize", updateKeyboardVisibility);
    window.addEventListener("orientationchange", updateKeyboardVisibility);

    return () => {
      viewport?.removeEventListener("resize", updateKeyboardVisibility);
      viewport?.removeEventListener("scroll", updateKeyboardVisibility);
      window.removeEventListener("resize", updateKeyboardVisibility);
      window.removeEventListener("orientationchange", updateKeyboardVisibility);
    };
  }, [clientOsName, isInputFocused]);

  return clientOsName === "ios" ? isInputFocused : isVisible;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isTop } = useActivity();
  const todayDateKey = getTodayFormatDateKey();
  const mainRef = useRef<HTMLElement>(null);
  const endAnchorRef = useRef<HTMLDivElement>(null);
  const timelineScrollElementRefs = useRef(new Map<string, HTMLElement>());
  const timelineScrollRequestIdRef = useRef(0);
  const assistantPlaybackRunIdRef = useRef(0);
  const assistantPlaybackChatItemIdsRef = useRef(new Set<number>());
  const knownHistoryChatItemIdsRef = useRef<Set<number> | null>(null);
  const pendingMealRecordScrollKeyRef = useRef<string | null>(null);
  const shouldFollowBottomRef = useRef(true);
  const skipNextAutoBottomScrollRef = useRef(false);
  const hiddenScrollTopSnapshotRef = useRef<number | null>(null);
  const previousIsTopRef = useRef(isTop);

  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [assistantPlayback, setAssistantPlayback] = useState<AssistantPlaybackState | null>(null);
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
  const [editingSelectedMenus, setEditingSelectedMenus] = useState<SelectedDiaryMealRecordMenu[]>(
    [],
  );
  const [mealRecordCancelTarget, setMealRecordCancelTarget] =
    useState<MealRecordCancelTarget | null>(null);
  const [timelineScrollTarget, setTimelineScrollTarget] = useState<TimelineScrollTarget | null>(
    null,
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const clientOsName = useClientOsName();
  const isSoftKeyboardVisible = useSoftKeyboardVisible(isInputFocused, clientOsName);

  const { data, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { mutateAsync: sendMessageMutation, isPending: isSendPending } = useSendMessageMutation();
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isDiaryMealRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const { mutateAsync: deleteDiaryMealRecordMutate, isPending: isDiaryMealDeletePending } =
    useTodayMealRecordDeleteWithRollbackMutation();
  const chatMealRecordFocusRequest = useChatMealRecordFocusRequest();
  const clearChatMealRecordFocusRequest = useClearChatMealRecordFocusRequest();

  const isMealRecordEditPending = isDiaryMealRegisterPending || isDiaryMealDeletePending;

  const chatList = useMemo(() => {
    const rawList = data?.chat_list ?? [];
    return rawList.filter(isChatHistoryItemResponse).sort(compareChatHistoryItems);
  }, [data]);
  const displayChatList = chatList;
  const chatDateKeys = useMemo(() => {
    const dateKeySet = new Set<string>([todayDateKey]);

    displayChatList.forEach((chatItem) => {
      const dateKey = getChatDateKey(chatItem);

      if (dateKey !== null) {
        dateKeySet.add(dateKey);
      }
    });

    return [...dateKeySet];
  }, [displayChatList, todayDateKey]);
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
  const timelineMealRecords = useMemo(() => {
    return chatDateKeys.flatMap((dateKey) => {
      const dayMeals = dayMealsByDate.get(dateKey);

      if (!dayMeals) {
        return [];
      }

      return getDateMealRecordViewModels(dayMeals, dateKey);
    });
  }, [chatDateKeys, dayMealsByDate]);
  const timelineItems = useMemo(
    () => buildChatTimelineItems(displayChatList, timelineMealRecords),
    [displayChatList, timelineMealRecords],
  );
  const timelineSignature = useMemo(
    () => timelineItems.map((item) => `${item.key}:${item.sortTime ?? "unknown"}`).join("|"),
    [timelineItems],
  );
  const todayMealQueryIndex = chatDateKeys.indexOf(todayDateKey);
  const isTodayMealPending =
    todayMealQueryIndex >= 0 ? (dayMealQueries[todayMealQueryIndex]?.isPending ?? false) : false;
  const editingMealRecordMenus = editingMealRecordContext?.menus ?? [];

  const assistantPlaybackSignature = assistantPlayback
    ? [
        assistantPlayback.chatItemId,
        assistantPlayback.visibleBubbleCount,
        assistantPlayback.resultVisibleCount,
      ].join(":")
    : "idle";
  const isAssistantPlaybackActive = assistantPlayback !== null;
  const isChatSendDisabled = isSendPending || isAssistantPlaybackActive;
  const isAwaitingChatResponse = pendingInput !== null || isAssistantPlaybackActive;
  const hasTimelineContent = timelineItems.length > 0 || isAwaitingChatResponse;
  const isTypingPending = isAwaitingChatResponse && isSendPending;
  const isInputEmpty = inputValue.trim().length === 0;
  const isQuickActionVisible = isInputEmpty && !isSoftKeyboardVisible && !isAwaitingChatResponse;
  const isScrollToBottomButtonVisible = hasTimelineContent && isScrolledAwayFromBottom;
  const isFloatingButtonVisible =
    !isSoftKeyboardVisible && (isQuickActionVisible || isScrollToBottomButtonVisible);
  const currentMealTime = getCurrentMealTime();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
    const main = mainRef.current;

    if (!main) {
      return;
    }

    main.scrollTo({
      behavior,
      top: main.scrollHeight,
    });
  }, []);

  const updateIsScrolledAwayFromBottom = useCallback((options?: { updateStickiness?: boolean }) => {
    const main = mainRef.current;

    if (!main) {
      return;
    }

    const distanceToBottom = main.scrollHeight - main.scrollTop - main.clientHeight;
    const isAwayFromBottom = distanceToBottom > SCROLL_BOTTOM_THRESHOLD;
    setIsScrolledAwayFromBottom(isAwayFromBottom);

    if (options?.updateStickiness) {
      shouldFollowBottomRef.current = !isAwayFromBottom;
    }

    if (isAwayFromBottom) {
      setIsCameraActionMenuOpen(false);
    }
  }, []);

  const handleMainScroll = useCallback(() => {
    updateIsScrolledAwayFromBottom({ updateStickiness: true });
  }, [updateIsScrolledAwayFromBottom]);

  const handleWindowResize = useCallback(() => {
    updateIsScrolledAwayFromBottom();
  }, [updateIsScrolledAwayFromBottom]);

  const keepBottomIfFollowing = useCallback(
    (behavior: ScrollBehavior = "instant") => {
      if (
        !isTop ||
        pendingMealRecordScrollKeyRef.current !== null ||
        timelineScrollTarget !== null ||
        !shouldFollowBottomRef.current
      ) {
        updateIsScrolledAwayFromBottom();
        return;
      }

      scrollToBottom(behavior);

      if (typeof window === "undefined") {
        updateIsScrolledAwayFromBottom();
        return;
      }

      window.requestAnimationFrame(() => {
        scrollToBottom("instant");
        updateIsScrolledAwayFromBottom();
      });
    },
    [isTop, scrollToBottom, timelineScrollTarget, updateIsScrolledAwayFromBottom],
  );

  const setTimelineScrollElementRef = useCallback((key: string, element: HTMLElement | null) => {
    if (element) {
      timelineScrollElementRefs.current.set(key, element);
      return;
    }

    timelineScrollElementRefs.current.delete(key);
  }, []);

  const commitTimelineScroll = useCallback((key: string, block: ScrollLogicalPosition) => {
    shouldFollowBottomRef.current = false;
    timelineScrollRequestIdRef.current += 1;
    setTimelineScrollTarget({
      block,
      key,
      requestId: timelineScrollRequestIdRef.current,
    });
  }, []);

  const cancelTimelineScroll = useCallback((key?: string) => {
    setTimelineScrollTarget((current) => (!key || current?.key === key ? null : current));
  }, []);

  const prepareMealRecordScroll = useCallback((dateKey: string, mealTime: MealTime) => {
    const key = getMealRecordTimelineItemKey(dateKey, mealTime);
    pendingMealRecordScrollKeyRef.current = key;
    return key;
  }, []);

  const commitMealRecordScroll = useCallback(
    (key: string) => {
      pendingMealRecordScrollKeyRef.current = key;
      commitTimelineScroll(key, "center");
    },
    [commitTimelineScroll],
  );

  const cancelMealRecordScroll = useCallback(
    (key: string) => {
      if (pendingMealRecordScrollKeyRef.current === key) {
        pendingMealRecordScrollKeyRef.current = null;
      }

      cancelTimelineScroll(key);
    },
    [cancelTimelineScroll],
  );

  useEffect(() => {
    if (!isTop || chatMealRecordFocusRequest === null) {
      return;
    }

    const targetKey = getMealRecordTimelineItemKey(
      chatMealRecordFocusRequest.dateKey,
      chatMealRecordFocusRequest.mealTime,
    );
    const hasTargetMealRecord = timelineItems.some(
      (item) => item.type === "mealRecord" && item.key === targetKey,
    );

    if (!hasTargetMealRecord) {
      return;
    }

    commitMealRecordScroll(targetKey);
    clearChatMealRecordFocusRequest(chatMealRecordFocusRequest.id);
  }, [
    chatMealRecordFocusRequest,
    clearChatMealRecordFocusRequest,
    commitMealRecordScroll,
    isTop,
    timelineItems,
  ]);

  useLayoutEffect(() => {
    const main = mainRef.current;
    const wasTop = previousIsTopRef.current;
    previousIsTopRef.current = isTop;

    if (!main) {
      return;
    }

    if (wasTop && !isTop) {
      hiddenScrollTopSnapshotRef.current = main.scrollTop;
      return;
    }

    if (!wasTop && isTop && hiddenScrollTopSnapshotRef.current !== null) {
      const maxScrollTop = Math.max(0, main.scrollHeight - main.clientHeight);
      main.scrollTop = Math.min(hiddenScrollTopSnapshotRef.current, maxScrollTop);
      hiddenScrollTopSnapshotRef.current = null;
      skipNextAutoBottomScrollRef.current = true;
      updateIsScrolledAwayFromBottom();
    }
  }, [isTop, updateIsScrolledAwayFromBottom]);

  useEffect(() => {
    if (pendingMealRecordScrollKeyRef.current !== null || timelineScrollTarget !== null) {
      return;
    }

    if (!isTop) {
      updateIsScrolledAwayFromBottom();
      return;
    }

    if (skipNextAutoBottomScrollRef.current) {
      skipNextAutoBottomScrollRef.current = false;
      updateIsScrolledAwayFromBottom();
      return;
    }

    if (!shouldFollowBottomRef.current) {
      updateIsScrolledAwayFromBottom();
      return;
    }

    keepBottomIfFollowing("instant");
  }, [
    assistantPlaybackSignature,
    isTop,
    keepBottomIfFollowing,
    timelineScrollTarget,
    timelineSignature,
    updateIsScrolledAwayFromBottom,
  ]);

  useEffect(() => {
    if (!isTop || !timelineScrollTarget || typeof window === "undefined") {
      return;
    }

    const scrollToTimelineTarget = () => {
      const targetElement = timelineScrollElementRefs.current.get(timelineScrollTarget.key);

      if (!targetElement) {
        return false;
      }

      targetElement.scrollIntoView({
        behavior: "smooth",
        block: timelineScrollTarget.block,
      });
      skipNextAutoBottomScrollRef.current = true;
      if (pendingMealRecordScrollKeyRef.current === timelineScrollTarget.key) {
        pendingMealRecordScrollKeyRef.current = null;
      }
      setTimelineScrollTarget((current) =>
        current?.requestId === timelineScrollTarget.requestId ? null : current,
      );
      updateIsScrolledAwayFromBottom();
      return true;
    };

    let timeoutId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (scrollToTimelineTarget()) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        if (!scrollToTimelineTarget()) {
          if (pendingMealRecordScrollKeyRef.current === timelineScrollTarget.key) {
            pendingMealRecordScrollKeyRef.current = null;
          }
          cancelTimelineScroll(timelineScrollTarget.key);
        }
      }, 500);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    cancelTimelineScroll,
    isTop,
    timelineScrollTarget,
    timelineSignature,
    updateIsScrolledAwayFromBottom,
  ]);

  useEffect(() => {
    if (
      pendingInput === null ||
      !isTop ||
      pendingMealRecordScrollKeyRef.current !== null ||
      timelineScrollTarget !== null
    ) {
      return;
    }

    keepBottomIfFollowing("smooth");
  }, [isTop, keepBottomIfFollowing, pendingInput, timelineScrollTarget]);

  useEffect(() => {
    updateIsScrolledAwayFromBottom();

    const main = mainRef.current;

    if (!main) {
      return;
    }

    main.addEventListener("scroll", handleMainScroll, { passive: true });
    window.addEventListener("resize", handleWindowResize);

    return () => {
      main.removeEventListener("scroll", handleMainScroll);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [handleMainScroll, handleWindowResize, updateIsScrolledAwayFromBottom]);

  useEffect(() => {
    return () => {
      assistantPlaybackRunIdRef.current += 1;
    };
  }, []);

  useEnsureBottomOnQuickAction({
    isTop,
    isQuickActionVisible,
    isScrolledAwayFromBottom,
    pendingMealRecordScrollKeyRef,
    timelineScrollTarget,
    endAnchorRef,
    updateIsScrolledAwayFromBottom,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateIsScrolledAwayFromBottom();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    assistantPlaybackSignature,
    hasTimelineContent,
    isSoftKeyboardVisible,
    isQuickActionVisible,
    pendingInput,
    updateIsScrolledAwayFromBottom,
  ]);

  const playAssistantResponse = useCallback(
    async (responseChatItem: ChatHistoryItemResponseDto) => {
      const playbackRunId = assistantPlaybackRunIdRef.current + 1;
      const responsePayload = responseChatItem.response_payload;
      const bubbleRevealCount = getAssistantBubbleRevealCount(responsePayload);
      const resultRevealCount = getAssistantResultRevealCount(responsePayload);
      const shouldPlayResponse = bubbleRevealCount > 0 || resultRevealCount > 0;
      const isCurrentPlayback = () => assistantPlaybackRunIdRef.current === playbackRunId;
      const updateVisibleBubbleCount = (visibleBubbleCount: number) => {
        setAssistantPlayback((current) => {
          if (!current || current.chatItemId !== responseChatItem.id) {
            return current;
          }

          return { ...current, visibleBubbleCount };
        });
      };
      const updateResultVisibleCount = (resultVisibleCount: number) => {
        setAssistantPlayback((current) => {
          if (!current || current.chatItemId !== responseChatItem.id) {
            return current;
          }

          return { ...current, resultVisibleCount };
        });
      };

      assistantPlaybackRunIdRef.current = playbackRunId;
      assistantPlaybackChatItemIdsRef.current.add(responseChatItem.id);

      if (shouldPlayResponse) {
        setAssistantPlayback({
          chatItemId: responseChatItem.id,
          visibleBubbleCount: 0,
          resultVisibleCount: 0,
        });
      }

      if (bubbleRevealCount > 0) {
        await delayAssistantPlayback(ASSISTANT_BUBBLE_REVEAL_START_DELAY_MS);
        if (!isCurrentPlayback()) return;

        for (
          let visibleBubbleCount = 1;
          visibleBubbleCount <= bubbleRevealCount;
          visibleBubbleCount += 1
        ) {
          if (!isCurrentPlayback()) return;

          updateVisibleBubbleCount(visibleBubbleCount);

          if (visibleBubbleCount < bubbleRevealCount) {
            await delayAssistantPlayback(ASSISTANT_BUBBLE_GAP_MS);
          }
        }
      }

      if (resultRevealCount > 0) {
        await delayAssistantPlayback(ASSISTANT_RESULT_REVEAL_DELAY_MS);
        if (!isCurrentPlayback()) return;

        for (
          let resultVisibleCount = 1;
          resultVisibleCount <= resultRevealCount;
          resultVisibleCount += 1
        ) {
          if (!isCurrentPlayback()) return;

          updateResultVisibleCount(resultVisibleCount);

          if (resultVisibleCount < resultRevealCount) {
            await delayAssistantPlayback(ASSISTANT_RESULT_CARD_GAP_MS);
          }
        }
      }

      setAssistantPlayback((current) =>
        current?.chatItemId === responseChatItem.id ? null : current,
      );
    },
    [],
  );

  useLayoutEffect(() => {
    if (isHistoryPending) {
      return;
    }

    const currentChatItemIds = new Set(chatList.map((chatItem) => chatItem.id));

    if (knownHistoryChatItemIdsRef.current === null) {
      knownHistoryChatItemIdsRef.current = currentChatItemIds;
      return;
    }

    const knownChatItemIds = knownHistoryChatItemIdsRef.current;

    currentChatItemIds.forEach((chatItemId) => {
      if (assistantPlaybackChatItemIdsRef.current.has(chatItemId)) {
        knownChatItemIds.add(chatItemId);
      }
    });

    const newChatItems = chatList
      .filter(
        (chatItem) =>
          !knownChatItemIds.has(chatItem.id) &&
          !assistantPlaybackChatItemIdsRef.current.has(chatItem.id),
      )
      .sort(compareChatHistoryItems);

    if (
      newChatItems.length === 0 ||
      !isTop ||
      pendingInput !== null ||
      assistantPlayback !== null
    ) {
      return;
    }

    const nextChatItem = newChatItems[0];
    knownChatItemIds.add(nextChatItem.id);
    void playAssistantResponse(nextChatItem);
  }, [assistantPlayback, chatList, isHistoryPending, isTop, pendingInput, playAssistantResponse]);

  const sendChatMessage = async (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || isChatSendDisabled) return;

    if (!isCameraHintDismissed) {
      setIsCameraHintDismissed(true);
      saveCameraHintDismissedInSession();
    }

    assistantPlaybackRunIdRef.current += 1;
    shouldFollowBottomRef.current = true;
    setAssistantPlayback(null);
    setIsCameraActionMenuOpen(false);
    setPendingInput(text);
    setInputValue("");
    track(EVENT_NAME.AI_COACH_CHAT, { input_length: text.length });

    try {
      const response = await sendMessageMutation({ input: text });
      const responsePayload = getSendMessageResponsePayload(response);
      const directHistoryChatItem = isChatHistoryItemResponse(response) ? response : null;
      const responseChatItem = await refetchAndResolveChatHistoryItem(queryClient, {
        match: (chatItem) =>
          directHistoryChatItem
            ? chatItem.id === directHistoryChatItem.id
            : isMatchingHistoryChatItem(chatItem, text, responsePayload),
      });

      setPendingInput(null);
      const playbackPromise = playAssistantResponse(responseChatItem);

      track(
        EVENT_NAME.AI_COACH_RESPONSE_SUCCESS,
        getAiCoachResponseAnalyticsProperties(responsePayload),
      );
      await playbackPromise;
    } catch (error) {
      track(EVENT_NAME.AI_COACH_RESPONSE_FAIL, {
        reason: resolveErrorMessage(error),
      });
      assistantPlaybackRunIdRef.current += 1;
      setAssistantPlayback(null);
      setPendingInput(null);
      toast.warning(resolveErrorMessage(error));
      if (error instanceof ChatHistorySyncError) {
        return;
      }

      setInputValue(text);
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

  const handleInputValueChange = (nextValue: string) => {
    setInputValue(nextValue);

    if (nextValue.trim().length > 0) {
      handleCloseCameraActionMenu();
    }
  };

  const handleInputFocusChange = (isFocused: boolean) => {
    setIsInputFocused(isFocused);

    if (isFocused) {
      handleCloseCameraActionMenu();
    }
  };

  const handleScrollToBottom = () => {
    handleCloseCameraActionMenu();
    shouldFollowBottomRef.current = true;
    keepBottomIfFollowing("smooth");
  };

  const handleTimelineImageLoad = useCallback(() => {
    keepBottomIfFollowing("instant");
  }, [keepBottomIfFollowing]);

  const handleNavigateMenuBoardCamera = () => {
    handleCloseCameraActionMenu();
    navigate(PATH.MENU_BOARD_CAMERA);
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
    const mealRecordMenus = getChatMealRecordMenus(meal);

    if (mealRecordMenus.length === 0) {
      return;
    }

    if (!dateKey || !dayMeals) {
      toast.warning("식사 기록을 등록할 수 없어요.");
      return;
    }

    const nextMealRecord = getMergedMealRecordPayload(
      mealRecordMenus,
      dayMeals,
      currentMealTime,
      mealRecord?.previousMealRecord,
    );

    if (!nextMealRecord.wasAdded) {
      toast.warning("이미 식사 기록에 추가된 메뉴예요.");
      return;
    }

    if (nextMealRecord.menus.length > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return;
    }

    const hadMealRecord = getSelectedDiaryMenusByTime(dayMeals, nextMealRecord.time).length > 0;
    const scrollTargetKey = prepareMealRecordScroll(dateKey, nextMealRecord.time);

    try {
      await registerDiaryMealRecordMutate(
        buildDiaryMealRecordRequest({
          dateKey,
          mealType: getMealTypeFromChatMealTime(nextMealRecord.time),
          selectedMenus: nextMealRecord.menus,
          image: mealRecord?.image ?? getDiaryMealImage(dayMeals, nextMealRecord.time),
        }),
      );
      trackRecommendMenuSave(nextMealRecord.addedMenus);

      let successMessage = "식사 기록이 수정되었어요.";

      if (nextMealRecord.addedMenus.length > 0) {
        successMessage = hadMealRecord
          ? "식사 기록에 메뉴를 추가했어요."
          : "식사 기록이 등록되었어요.";
      }

      toast.success(successMessage);
      commitMealRecordScroll(scrollTargetKey);
    } catch (error) {
      cancelMealRecordScroll(scrollTargetKey);
      toast.warning(
        resolveErrorMessage(error, "식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요."),
      );
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
    setEditingSelectedMenus(mealRecord.previousMealRecord.menus);
  };

  const handleMealRecordEditClose = () => {
    setEditingMealRecordContext(null);
    setEditingSelectedMenus([]);
  };

  const handleChatMealRecordRemoveClick = async (
    meal: ChatHistoryItemResponseDto,
    mealRecord: MealRecordViewModel | null,
  ) => {
    const mealRecordMenus = getChatMealRecordMenus(meal);

    if (!mealRecord || mealRecordMenus.length === 0) {
      return;
    }

    const previousMealRecord = mealRecord.previousMealRecord;
    const remainingMenus = getRemainingMealRecordMenus(
      previousMealRecord,
      mealRecordMenus.map((menu) => menu.menu_id),
    );

    if (remainingMenus.length === previousMealRecord.menus.length) {
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
          analytics: {
            recommendMenuCancel: mealRecordMenus,
          },
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
      const scrollTargetKey = prepareMealRecordScroll(mealRecord.dateKey, previousMealRecord.time);

      await registerDiaryMealRecordMutate({
        ...buildDiaryMealRecordRequest({
          dateKey: mealRecord.dateKey,
          mealType: getMealTypeFromChatMealTime(previousMealRecord.time),
          selectedMenus: remainingMenus,
          image: mealRecord.image,
        }),
        analytics: {
          recommendMenuCancel: mealRecordMenus,
        },
      });

      toast.success("식사 기록에서 메뉴를 제거했어요.");
      commitMealRecordScroll(scrollTargetKey);
    } catch {
      cancelMealRecordScroll(
        getMealRecordTimelineItemKey(mealRecord.dateKey, previousMealRecord.time),
      );
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
        analytics: {
          recommendMenuCancel: mealRecord.menus,
        },
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

  const handleChatMealRecordCancelRequest = (
    chatItem: ChatHistoryItemResponseDto,
    mealRecord: MealRecordViewModel | null,
  ) => {
    if (!mealRecord) {
      return;
    }

    setMealRecordCancelTarget({
      type: "chatMenus",
      chatItem,
      mealRecord,
    });
  };

  const handleMealRecordCancelRequest = (mealRecord: MealRecordViewModel) => {
    setMealRecordCancelTarget({
      type: "mealRecord",
      mealRecord,
    });
  };

  const handleMealRecordCancelConfirm = async () => {
    if (mealRecordCancelTarget === null) {
      return;
    }

    if (mealRecordCancelTarget.type === "chatMenus") {
      await handleChatMealRecordRemoveClick(
        mealRecordCancelTarget.chatItem,
        mealRecordCancelTarget.mealRecord,
      );
      return;
    }

    await handleDiaryMealRecordCancelClick(mealRecordCancelTarget.mealRecord);
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
    if (editingMealRecordContext === null || isMealRecordEditPending) {
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
        : getNextDiaryMenusByCandidateIds({
            dayMeals: editingMealRecordContext.dayMeals,
            time: nextTime,
            selectedMenus: editingSelectedMenus,
            candidateIds: editingSelectedMenus.map((menu) => menu.id),
          });
    const removedMenus = getRemovedMealRecordMenus(
      previousMealRecord.menus,
      nextMenus,
      editingMealRecordContext.menus,
    );

    if (nextMenus.length === 0) {
      try {
        const deleteResult = await deleteDiaryMealRecordMutate({
          dateKey: editingMealRecordContext.dateKey,
          request: buildDiaryMealRecordRequest({
            dateKey: editingMealRecordContext.dateKey,
            mealType: previousMealType,
            selectedMenus: [],
            image: editingMealRecordContext.image,
          }),
          currentMenusByTime: editingMealRecordContext.dayMeals.menusByTime,
          analytics: {
            recommendMenuCancel: removedMenus,
          },
        });

        if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return;
        }

        toast.success("식사 기록을 취소했어요.");
        handleMealRecordEditClose();
      } catch {
        toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    if (nextMenus.length > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return;
    }

    const scrollTargetKey = prepareMealRecordScroll(editingMealRecordContext.dateKey, nextTime);

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
          cancelMealRecordScroll(scrollTargetKey);
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return;
        }
      }

      await registerDiaryMealRecordMutate({
        ...buildDiaryMealRecordRequest({
          dateKey: editingMealRecordContext.dateKey,
          mealType: editingMealType,
          selectedMenus: nextMenus,
          image:
            previousMealRecord.time === nextTime
              ? editingMealRecordContext.image
              : getDiaryMealImage(editingMealRecordContext.dayMeals, nextTime),
        }),
        analytics: {
          recommendMenuCancel: removedMenus,
        },
      });

      toast.success("식사 기록이 수정되었어요.");
      handleMealRecordEditClose();
      commitMealRecordScroll(scrollTargetKey);
    } catch {
      cancelMealRecordScroll(scrollTargetKey);

      if (previousMealRecord.time !== nextTime) {
        try {
          await registerDiaryMealRecordMutate(
            buildDiaryMealRecordRequest({
              dateKey: editingMealRecordContext.dateKey,
              mealType: previousMealType,
              selectedMenus: previousMealRecord.menus,
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

      {isCameraActionMenuOpen && isQuickActionVisible && !isScrollToBottomButtonVisible ? (
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
            {timelineItems.map((timelineItem, index) => {
              const previousItem = timelineItems[index - 1];
              const shouldShowDateDivider = shouldShowTimelineDateDivider(
                timelineItem,
                previousItem,
              );

              if (timelineItem.type === "mealRecord") {
                const { mealRecord } = timelineItem;

                return (
                  <section
                    key={timelineItem.key}
                    ref={(element) => setTimelineScrollElementRef(timelineItem.key, element)}
                    className={styles.conversationSection}
                  >
                    {shouldShowDateDivider && timelineItem.date ? (
                      <div className={styles.dateDivider}>
                        <span className={`${styles.dateText} typo-caption4`}>
                          {formatDateDividerText(timelineItem.date)}
                        </span>
                      </div>
                    ) : null}

                    <div className={styles.assistantMessageRow}>
                      <MealRecordCard
                        menus={mealRecord.recordedMenus}
                        mealRecordTime={mealRecord.time}
                        dateKey={mealRecord.dateKey}
                        timeText={formatTimeText(getMealRecordSavedAt(mealRecord))}
                        onCancelClick={() => handleMealRecordCancelRequest(mealRecord)}
                        onEditClick={() => handleMealRecordEditClick(mealRecord)}
                      />
                    </div>
                  </section>
                );
              }

              const { chatItem } = timelineItem;
              const chatDateKey = getChatDateKey(chatItem);
              const chatDayMeals = chatDateKey ? dayMealsByDate.get(chatDateKey) : undefined;
              const fallbackMealRecord =
                chatDateKey && chatDayMeals
                  ? getMealRecordViewModelByTime(chatDayMeals, chatDateKey, currentMealTime)
                  : null;
              const mealRecordMenus = getChatMealRecordMenus(chatItem);
              const chatMealRecord =
                chatDateKey && mealRecordMenus.length > 0
                  ? getMealRecordViewModelByMenuIds(
                      chatDayMeals,
                      chatDateKey,
                      mealRecordMenus.map((menu) => menu.menu_id),
                    )
                  : null;
              const userImageUrl = getChatItemImageUrl(chatItem);
              const assistantTimeText = formatTimeText(chatItem.createdAt);
              const chatItemPlayback =
                assistantPlayback?.chatItemId === chatItem.id
                  ? assistantPlayback
                  : null;
              const introMessage = chatItem.response_payload.intro_message;
              const generalAnswer =
                chatItem.response_payload.chat_category === "general"
                  ? chatItem.response_payload.general_answer
                  : "";
              const introBubbleCount = getAssistantMessageBubbleCount(introMessage);
              const visibleBubbleCount =
                chatItemPlayback === null
                  ? Number.POSITIVE_INFINITY
                  : chatItemPlayback.visibleBubbleCount;
              const visibleIntroBubbleCount = Math.min(visibleBubbleCount, introBubbleCount);
              const visibleGeneralBubbleCount = Math.max(0, visibleBubbleCount - introBubbleCount);
              const shouldAnimateAssistantResponse = chatItemPlayback !== null;
              const shouldShowIntroMessage =
                introMessage.trim().length > 0 && visibleIntroBubbleCount > 0;
              const shouldShowGeneralAnswer =
                chatItem.response_payload.chat_category === "general" &&
                generalAnswer.trim().length > 0 &&
                visibleGeneralBubbleCount > 0;
              const resultVisibleCount =
                chatItemPlayback === null
                  ? Number.POSITIVE_INFINITY
                  : chatItemPlayback.resultVisibleCount;
              const shouldShowResultSection = resultVisibleCount > 0;
              const userImageAction =
                userImageUrl === null
                  ? null
                  : chatItem.response_payload.chat_category === "feedback"
                    ? {
                        ariaLabel: "피드백 결과 보기",
                        onClick: () => navigate(getFeedbackResultPath(chatItem.id)),
                      }
                    : chatItem.response_payload.chat_category === "recommendation"
                      ? {
                          ariaLabel: "업로드 이미지 크게 보기",
                          onClick: () => setPreviewImageUrl(userImageUrl),
                        }
                      : null;

              return (
                <section key={timelineItem.key} className={styles.conversationSection}>
                  {shouldShowDateDivider && timelineItem.date ? (
                    <div className={styles.dateDivider}>
                      <span className={`${styles.dateText} typo-caption4`}>
                        {formatDateDividerText(timelineItem.date)}
                      </span>
                    </div>
                  ) : null}

                  <div className={styles.userMessageGroup}>
                    <p className={`${styles.timeText} typo-caption4`}>
                      {formatTimeText(chatItem.createdAt)}
                    </p>
                    <div className={styles.userMessageContent}>
                      {!userImageUrl && (
                        <p className={`${styles.userBubble} typo-body2`}>{chatItem.input_text}</p>
                      )}
                      {userImageUrl ? (
                        userImageAction ? (
                          <button
                            type="button"
                            className={styles.userImageButton}
                            aria-label={userImageAction.ariaLabel}
                            onClick={userImageAction.onClick}
                          >
                            <UserImageBubble
                              src={userImageUrl}
                              alt=""
                              isDecorative
                              onLoad={handleTimelineImageLoad}
                            />
                          </button>
                        ) : (
                          <UserImageBubble
                            src={userImageUrl}
                            alt="사용자가 업로드한 이미지"
                            onLoad={handleTimelineImageLoad}
                          />
                        )
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.assistantMessageRow}>
                    <div className={styles.assistantMessageContent}>
                      {shouldShowIntroMessage ? (
                        <AssistantMessageBubbles
                          animate={shouldAnimateAssistantResponse}
                          message={introMessage}
                          timeText={assistantTimeText}
                          visibleBubbleCount={visibleIntroBubbleCount}
                        />
                      ) : null}

                      {shouldShowGeneralAnswer ? (
                        <AssistantMessageBubbles
                          animate={shouldAnimateAssistantResponse}
                          message={generalAnswer}
                          timeText={assistantTimeText}
                          visibleBubbleCount={visibleGeneralBubbleCount}
                        />
                      ) : null}

                      {chatItem.response_payload.chat_category === "recommendation" &&
                      chatItem.response_payload.recommendations.length > 0 &&
                      shouldShowResultSection ? (
                        <RecommendationSection
                          chatId={chatItem.id}
                          animate={shouldAnimateAssistantResponse}
                          recommendations={chatItem.response_payload.recommendations}
                          visibleCardCount={resultVisibleCount}
                          onMealRecordClick={() =>
                            handleMenuRecordClick(
                              chatItem,
                              chatDateKey,
                              chatDayMeals,
                              fallbackMealRecord,
                            )
                          }
                          onMealRecordCancelClick={() =>
                            handleChatMealRecordCancelRequest(chatItem, chatMealRecord)
                          }
                          isMealRecorded={chatMealRecord !== null}
                        />
                      ) : null}

                      {chatItem.response_payload.chat_category === "feedback" &&
                      shouldShowResultSection ? (
                        <FeedbackSection
                          chatId={chatItem.id}
                          animate={shouldAnimateAssistantResponse}
                          feedback={chatItem.response_payload.feedback}
                          hasImage={userImageUrl !== null}
                          timeText={assistantTimeText}
                          onMealRecordClick={() =>
                            handleMenuRecordClick(
                              chatItem,
                              chatDateKey,
                              chatDayMeals,
                              fallbackMealRecord,
                            )
                          }
                          onMealRecordCancelClick={() =>
                            handleChatMealRecordCancelRequest(chatItem, chatMealRecord)
                          }
                          isMealRecorded={chatMealRecord !== null}
                        />
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}

            {pendingInput !== null ? (
              <section className={styles.conversationSection} aria-live="polite">
                <div className={styles.userMessageGroup}>
                  <p className={`${styles.timeText} typo-caption4`}>{formatTimeText(new Date())}</p>
                  <p className={`${styles.userBubble} typo-body2`}>{pendingInput}</p>
                </div>

                {isTypingPending ? <AssistantPendingMessage /> : null}
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
                  <SystemIcon name="chevron-down-normal" size={24} />
                ) : isCameraActionMenuOpen ? (
                  <SystemIcon name="close" size={24} />
                ) : (
                  <SystemIcon name="camera" size={24} />
                )}
              </button>
            </div>
          </div>
        )}
        <div>
          {!isSoftKeyboardVisible && !isAwaitingChatResponse && (
            <section className={`${styles.chipSection}`}>
              {QUICK_CHIP_LIST.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={styles.chipContainer}
                  onClick={() => sendChatMessage(chip)}
                  disabled={isChatSendDisabled}
                >
                  <p className="typo-body2">{chip}</p>
                </button>
              ))}
            </section>
          )}
        </div>
        <div ref={endAnchorRef} />
      </main>

      <footer
        className={`${styles.footer} ${isSoftKeyboardVisible ? styles.footerKeyboardOpen : ""}`}
      >
        <ChatInput
          value={inputValue}
          isInputEmpty={isInputEmpty}
          isSendPending={isChatSendDisabled}
          onChange={handleInputValueChange}
          onInputFocusChange={handleInputFocusChange}
          onDirectMenuRecordClick={handleNavigateDirectMenuRecord}
          onSubmit={handleSubmit}
        />
      </footer>

      <ChatMealRecordBottomSheet
        isOpen={editingMealRecordContext !== null}
        recommendations={editingMealRecordMenus}
        selectedMenus={editingSelectedMenus}
        mealType={editingMealType}
        dateKey={editingMealRecordContext?.dateKey}
        submitLabel="수정하기"
        isSubmitPending={isMealRecordEditPending}
        onMealTypeChange={setEditingMealType}
        onQuantityChange={handleEditingQuantityChange}
        onModeChange={handleEditingModeChange}
        onRemoveMenu={handleEditingRemoveMenu}
        onAddMore={handleEditingAddMore}
        onClose={handleMealRecordEditClose}
        onSubmit={handleMealRecordEditSubmit}
      />
      <ConfirmModal
        open={mealRecordCancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMealRecordCancelTarget(null);
          }
        }}
        title="기록 취소"
        description={getMealRecordCancelDescription(mealRecordCancelTarget)}
        cancelText="취소"
        confirmText="확인"
        confirmDisabled={isMealRecordEditPending}
        closeOnConfirm={false}
        onConfirm={handleMealRecordCancelConfirm}
      />
      {previewImageUrl ? (
        <UserImagePreviewOverlay
          src={previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
        />
      ) : null}
    </div>
  );
}

function delayAssistantPlayback(delayMs: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function getAssistantBubbleRevealCount(responsePayload: ChatRecommendResponseDto) {
  const introBubbleCount = getAssistantMessageBubbleCount(responsePayload.intro_message);

  if (responsePayload.chat_category !== "general") {
    return introBubbleCount;
  }

  return introBubbleCount + getAssistantMessageBubbleCount(responsePayload.general_answer);
}

function getAssistantMessageBubbleCount(message: string) {
  return getAssistantMessageBubbleTexts(message).length;
}

function getAssistantMessageBubbleTexts(message: string) {
  return message.split(/\r?\n/).filter((bubbleMessage) => bubbleMessage.trim());
}

function getAssistantResultRevealCount(responsePayload: ChatRecommendResponseDto) {
  if (responsePayload.chat_category === "recommendation") {
    if (responsePayload.recommendations.length === 0) {
      return 0;
    }

    return responsePayload.recommendations.length > 1 ? 2 : 1;
  }

  if (responsePayload.chat_category === "feedback") {
    return responsePayload.feedback.menus.length > 0 ? 1 : 0;
  }

  return 0;
}

function getMealRecordCancelDescription(target: MealRecordCancelTarget | null) {
  if (target?.type !== "chatMenus") {
    return "이 식사 기록을 취소할까요?";
  }

  return getChatMealRecordMenus(target.chatItem).length > 1
    ? "이 메뉴들을 식사 기록에서 제거할까요?"
    : "이 메뉴를 식사 기록에서 제거할까요?";
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

function UserImageBubble({
  alt,
  isDecorative = false,
  onLoad,
  src,
}: {
  alt: string;
  isDecorative?: boolean;
  onLoad?: () => void;
  src: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const handleLoadSettled = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <span className={styles.userImageBubbleFrame}>
      {!isLoaded ? (
        <Skeleton
          width="100%"
          height="100%"
          radius={12}
          style={{ inset: 0, position: "absolute" }}
        />
      ) : null}
      <img
        src={src}
        alt={isDecorative ? "" : alt}
        aria-hidden={isDecorative ? "true" : undefined}
        className={[
          styles.userImageBubble,
          isLoaded ? styles.userImageBubbleLoaded : styles.userImageBubbleLoading,
        ].join(" ")}
        onLoad={handleLoadSettled}
        onError={handleLoadSettled}
      />
    </span>
  );
}

function UserImagePreviewOverlay({ onClose, src }: { onClose: () => void; src: string }) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.userImagePreviewOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="업로드 이미지 미리보기"
      onClick={handleBackdropClick}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className={styles.userImagePreviewCloseButton}
        aria-label="이미지 닫기"
        onClick={onClose}
      >
        <SystemIcon name="close" size={24} />
      </button>
      <img src={src} alt="사용자가 업로드한 이미지" className={styles.userImagePreviewImage} />
    </div>
  );
}

function AssistantMessageBubbles({
  animate = false,
  message,
  timeText,
  visibleBubbleCount = Number.POSITIVE_INFINITY,
}: {
  animate?: boolean;
  message: string;
  timeText?: string;
  visibleBubbleCount?: number;
}) {
  const bubbleMessages = getAssistantMessageBubbleTexts(message);
  const visibleBubbleMessages = bubbleMessages.slice(0, visibleBubbleCount);

  return (
    <>
      {visibleBubbleMessages.map((bubbleMessage, index) => {
        const isLastBubble = index === bubbleMessages.length - 1;

        return (
          <p
            key={index}
            className={`${styles.assistantBubble} ${
              timeText && isLastBubble ? `${styles.assistantBubbleWithTime}` : ""
            } ${animate ? styles.assistantBubbleAnimated : ""} typo-body2`}
            data-time={timeText && isLastBubble ? timeText : undefined}
          >
            <AssistantMessageText text={bubbleMessage} />
          </p>
        );
      })}
    </>
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
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const lastPointerSubmitAtRef = useRef(0);
  const isSendDisabled = isInputEmpty || isSendPending;

  const handleInputChange = (nextValue: string) => {
    if (isAddActionOpen && nextValue.trim().length > 0) {
      setIsAddActionOpen(false);
    }

    onChange(nextValue);
  };

  const submitMessage = () => {
    if (isSendDisabled) {
      return;
    }

    void onSubmit();
    textInputRef.current?.blur();
  };

  const handleSendPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (isSendDisabled) {
      return;
    }

    event.preventDefault();
    lastPointerSubmitAtRef.current = Date.now();
    submitMessage();
  };

  const handleSendClick = (event: MouseEvent<HTMLButtonElement>) => {
    const wasHandledByPointerDown =
      event.detail > 0 && Date.now() - lastPointerSubmitAtRef.current < 750;

    if (wasHandledByPointerDown) {
      return;
    }

    submitMessage();
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
          <SystemIcon
            name="plus"
            size={24}
            className={`${styles.plusIcon} ${isAddActionOpen ? styles.plusIconOpen : ""}`}
          />
        </button>

        <div className={styles.textInputWrapper}>
          <textarea
            ref={textInputRef}
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
              type="button"
              className={`${styles.sendIconContainer} ${isSendDisabled ? styles.sendIconContainerDisabled : ""}`}
              disabled={isSendDisabled}
              onPointerDown={handleSendPointerDown}
              onClick={handleSendClick}
              aria-label="메시지 전송"
            >
              <SystemIcon name="chevron-up-normal" size={24} />
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
  dateKey,
  timeText,
  onCancelClick,
  onEditClick,
}: {
  menus: RecordedMenuSummary[];
  mealRecordTime: MealTime;
  dateKey: string;
  timeText: string;
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
    <section
      className={`${styles.mealRecordCard} ${styles.mealRecordCardWithTime}`}
      data-time={timeText}
    >
      <p className={`${styles.textAssistive} ${styles.datelabel}  typo-caption4`}>
        {formatDateKeyToMonthDayWeekdayLabel(dateKey)}
      </p>
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
          <SystemIcon
            name="chevron-up-normal"
            size={24}
            className={`${styles.mealRecordChevron} ${isOpen ? styles.mealRecordChevronOpen : ""}`}
          />
        ) : null}
      </button>

      {hasMultipleMenus && isOpen ? (
        <button type="button" onClick={onEditClick} className={styles.mealRecordMenuList}>
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
        </button>
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
  animate = false,
  chatId,
  recommendations,
  visibleCardCount,
  onMealRecordClick,
  onMealRecordCancelClick,
  isMealRecorded,
}: {
  animate?: boolean;
  chatId: number;
  recommendations: ChatRecommendItemResponseDto[];
  visibleCardCount: number;
  onMealRecordClick: () => void;
  onMealRecordCancelClick: () => void;
  isMealRecorded: boolean;
}) {
  const navigate = useNavigate();
  const topRecommendation = recommendations[0];
  const remaining = recommendations.slice(1);

  if (!topRecommendation) return null;

  const topBadgeText = topRecommendation.rank ? `${topRecommendation.rank}위` : "추천";
  const handleRecommendationDetailClick = (event?: MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
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

  const handleMealRecordToggleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    if (isMealRecorded) {
      onMealRecordCancelClick();
      return;
    }

    onMealRecordClick();
  };

  return (
    <div className={styles.recommendationSection}>
      {visibleCardCount >= 1 ? (
        <article
          className={`${styles.recommendCard} ${isMealRecorded ? styles.cardSelected : ""} ${
            animate ? styles.assistantResultCardAnimated : ""
          }`}
          role="button"
          tabIndex={0}
          aria-label="추천 상세 보기"
          onClick={handleRecommendationCardClick}
          onKeyDown={handleRecommendationCardKeyDown}
        >
          <span className={`${styles.rankBadge} typo-label6`}>{topBadgeText}</span>

          <div className={styles.recommendContents}>
            <p className={`${styles.recommendMenuName} typo-title2`}>
              {topRecommendation.menu_name}
            </p>
            <div className={styles.recommendMetaRow}>
              <p className={styles.menuInfoRow}>
                {topRecommendation.brand && (
                  <span className={`${styles.recommendBrand} typo-label4`}>
                    {topRecommendation.brand}
                  </span>
                )}
                <span className={`${styles.recommendAmount} typo-label4`}>
                  1{getServingUnitLabel(topRecommendation.unit_quantity)} (
                  {topRecommendation.weight}
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
                  <SystemIcon name="check" size={16} className={styles.recommendActionIcon} />
                ) : (
                  <SystemIcon name="plus" size={16} className={styles.recommendActionIcon} />
                )}
              </Button>
              <Button size="small" variant="outlined" onClick={handleRecommendationDetailClick}>
                자세히 보기
                <SystemIcon
                  name="chevron-right-normal"
                  size={16}
                  className={styles.recommendActionIcon}
                />
              </Button>
            </div>
          </div>
        </article>
      ) : null}

      {remaining.length > 0 && visibleCardCount >= 2 ? (
        <button
          type="button"
          className={`${styles.moreRecommendCard} ${
            animate ? styles.assistantResultCardAnimated : ""
          }`}
          aria-label="추천 목록 더보기"
          onClick={() => navigate(getRecommendResultPath(chatId))}
        >
          <p className={`${styles.textNormal} typo-body2`}>
            다른 추천 메뉴도 있어요 (총 {recommendations.length}개)
          </p>
          <p className={`${styles.ActionIcon} typo-label3`}>
            더보기
            <SystemIcon name="chevron-right-normal" size={20} />
          </p>
        </button>
      ) : null}
    </div>
  );
}

function FeedbackSection({
  animate = false,
  chatId,
  feedback,
  hasImage,
  onMealRecordClick,
  onMealRecordCancelClick,
  isMealRecorded,
}: {
  animate?: boolean;
  chatId: number;
  feedback: FeedbackDto;
  hasImage: boolean;
  timeText: string;
  onMealRecordClick: () => void;
  onMealRecordCancelClick: () => void;
  isMealRecorded: boolean;
}) {
  const [isMenuListOpen, setIsMenuListOpen] = useState(false);
  const primaryMenu = feedback.menus[0];
  const hasMultipleMenus = feedback.menus.length > 1;
  const navigate = useNavigate();

  if (!primaryMenu) return null;

  const handleFeedbackDetailClick = (event?: MouseEvent<HTMLElement>) => {
    event?.stopPropagation();

    if (hasImage || hasMultipleMenus) {
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

  const handleMealRecordToggleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    if (isMealRecorded) {
      onMealRecordCancelClick();
      return;
    }

    onMealRecordClick();
  };

  return (
    <div className={styles.feedbackSection}>
      <article
        className={`${styles.feedbackCard} ${isMealRecorded ? styles.cardSelected : ""} ${
          animate ? styles.assistantResultCardAnimated : ""
        }`}
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
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuListOpen((prev) => !prev);
                }}
              >
                <p className={`${styles.textAssistive} typo-label4`}>총 칼로리</p>

                <p className={`${styles.feedbackCalories} textNoWrap typo-title3`}>
                  {formatNumberWithMaxOneDecimal(feedback.total_calories)}kcal
                  <SystemIcon
                    name="chevron-up-normal"
                    size={24}
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
                  <p className={`${styles.feedbackMenuItemName} typo-body3`}>{menu.menu_name}</p>

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
                <SystemIcon name="check" size={16} className={styles.feedbackActionIcon} />
              ) : (
                <SystemIcon name="plus" size={16} className={styles.feedbackActionIcon} />
              )}
            </Button>
            <Button size="small" variant="outlined" fullWidth onClick={handleFeedbackDetailClick}>
              자세히 보기
              <SystemIcon
                name="chevron-right-normal"
                size={16}
                className={styles.feedbackActionIcon}
              />
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}

function isNestedInteractiveTarget(target: EventTarget | null, boundary: HTMLElement) {
  if (!(target instanceof Element)) {
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

function getChatMealRecordMenus(chatItem: ChatHistoryItemResponseDto): ChatMealRecordMenu[] {
  if (chatItem.response_payload.chat_category === "recommendation") {
    const topRecommendation = chatItem.response_payload.recommendations[0];
    return topRecommendation ? [topRecommendation] : [];
  }

  if (chatItem.response_payload.chat_category === "feedback") {
    return chatItem.response_payload.feedback.menus;
  }

  return [];
}

function getUniqueMealRecordMenus(menus: ChatMealRecordMenu[]) {
  const menuById = new Map<number, ChatMealRecordMenu>();

  menus.forEach((menu) => {
    menuById.set(menu.menu_id, menu);
  });

  return [...menuById.values()];
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
  mealRecordMenus: ChatMealRecordMenu[],
  dayMeals: DayMealSummary,
  fallbackMealTime: MealTime,
  mealRecord?: MealRecordSnapshot,
): {
  time: MealTime;
  menus: SelectedDiaryMealRecordMenu[];
  addedMenus: ChatMealRecordMenu[];
  wasAdded: boolean;
} {
  const time = mealRecord?.time ?? fallbackMealTime;
  const previousMenus = mealRecord ? mealRecord.menus : getSelectedDiaryMenusByTime(dayMeals, time);
  const candidateMenus = getUniqueMealRecordMenus(mealRecordMenus);
  const candidateMenuIds = candidateMenus.map((menu) => menu.menu_id);
  const nextSelectedMenus = getSelectedDiaryMenusFromCandidateMenus(candidateMenus);
  const menus = getNextDiaryMenusByCandidateIds({
    dayMeals,
    time,
    selectedMenus: nextSelectedMenus,
    candidateIds: candidateMenuIds,
  });
  const previousMenuById = new Map(previousMenus.map((menu) => [menu.id, menu]));
  const addedMenus = candidateMenus.filter((menu) => !previousMenuById.has(menu.menu_id));
  const wasChanged = nextSelectedMenus.some((menu) =>
    isSelectedDiaryMealRecordMenuChanged(menu, previousMenuById.get(menu.id)),
  );

  if (!wasChanged) {
    return {
      time,
      menus: previousMenus,
      addedMenus,
      wasAdded: false,
    };
  }

  return {
    time,
    menus,
    addedMenus,
    wasAdded: true,
  };
}

function isSelectedDiaryMealRecordMenuChanged(
  nextMenu: SelectedDiaryMealRecordMenu,
  previousMenu: SelectedDiaryMealRecordMenu | undefined,
) {
  return (
    !previousMenu ||
    previousMenu.quantity !== nextMenu.quantity ||
    previousMenu.mode !== nextMenu.mode
  );
}

function getRemainingMealRecordMenus(
  mealRecord: MealRecordSnapshot,
  removeMenuIds: number[],
): SelectedDiaryMealRecordMenu[] {
  const removeMenuIdSet = new Set(removeMenuIds);
  return mealRecord.menus.filter((menu) => !removeMenuIdSet.has(menu.id));
}

function getRemovedMealRecordMenus(
  previousMenus: SelectedDiaryMealRecordMenu[],
  nextMenus: SelectedDiaryMealRecordMenu[],
  menuDetails: ChatMealRecordMenu[],
) {
  const nextMenuIdSet = new Set(nextMenus.map((menu) => menu.id));
  const removedMenuIdSet = new Set(
    previousMenus.filter((menu) => !nextMenuIdSet.has(menu.id)).map((menu) => menu.id),
  );

  return menuDetails.filter((menu) => removedMenuIdSet.has(menu.menu_id));
}

function getMealRecordViewModelByTime(
  dayMeals: DayMealSummary | undefined,
  dateKey: string,
  mealTime: MealTime,
) {
  if (!dayMeals) {
    return null;
  }

  return buildMealRecordViewModel(dateKey, dayMeals, mealTime);
}

function getMealRecordViewModelByMenuIds(
  dayMeals: DayMealSummary | undefined,
  dateKey: string,
  menuIds: number[],
) {
  if (!dayMeals || menuIds.length === 0) {
    return null;
  }

  const targetMenuIds = [...new Set(menuIds)];

  for (const mealTime of MEAL_TIME_LIST) {
    const menus = dayMeals.menusByTime?.[mealTime] ?? [];
    const recordedMenuIds = new Set(menus.map((menu) => menu.id));

    if (targetMenuIds.every((menuId) => recordedMenuIds.has(menuId))) {
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
  const menus = dayMeals.menusByTime?.[mealTime] ?? [];

  if (menus.length === 0) {
    return null;
  }

  const selectedMenus = getSelectedDiaryMenusByTime(dayMeals, mealTime);

  return {
    dateKey,
    dayMeals,
    image: getDiaryMealImage(dayMeals, mealTime),
    time: mealTime,
    createdAt: dayMeals.mealRecordTimestampsByTime?.[mealTime]?.createdAt,
    updatedAt: dayMeals.mealRecordTimestampsByTime?.[mealTime]?.updatedAt,
    menus: menus.map(toChatMealRecordMenu),
    recordedMenus: menus.map(toRecordedMenuSummary),
    previousMealRecord: {
      time: mealTime,
      menus: selectedMenus,
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

function compareChatHistoryItems(a: ChatHistoryItemResponseDto, b: ChatHistoryItemResponseDto) {
  const aTime = parseDateValue(a.createdAt);
  const bTime = parseDateValue(b.createdAt);

  if (aTime !== null && bTime !== null && aTime !== bTime) {
    return aTime - bTime;
  }

  if (aTime === null && bTime !== null) return -1;
  if (aTime !== null && bTime === null) return 1;
  return a.id - b.id;
}

function buildChatTimelineItems(
  chatList: ChatHistoryItemResponseDto[],
  mealRecords: MealRecordViewModel[],
): ChatTimelineItem[] {
  return [...chatList.map(toChatTimelineItem), ...mealRecords.map(toMealRecordTimelineItem)].sort(
    compareChatTimelineItems,
  );
}

function toChatTimelineItem(chatItem: ChatHistoryItemResponseDto): ChatTimelineItem {
  const date = parseDate(chatItem.createdAt);

  return {
    type: "chat",
    key: getChatTimelineItemKey(chatItem.id),
    date,
    sortTime: parseDateValue(date),
    chatItem,
  };
}

function getChatTimelineItemKey(chatId: number) {
  return `chat-${chatId}`;
}

function toMealRecordTimelineItem(mealRecord: MealRecordViewModel): ChatTimelineItem {
  const date = getMealRecordTimelineDate(mealRecord);
  const sortDate = getMealRecordSortDate(mealRecord);

  return {
    type: "mealRecord",
    key: getMealRecordTimelineItemKey(mealRecord.dateKey, mealRecord.time),
    date,
    sortTime: parseDateValue(sortDate),
    mealRecord,
  };
}

function getMealRecordTimelineItemKey(dateKey: string, mealTime: MealTime) {
  return `meal-record-${dateKey}-${mealTime}`;
}

function compareChatTimelineItems(a: ChatTimelineItem, b: ChatTimelineItem) {
  const dateOrderDifference = compareTimelineItemDates(a, b);
  if (dateOrderDifference !== 0) {
    return dateOrderDifference;
  }

  if (a.sortTime !== null && b.sortTime !== null && a.sortTime !== b.sortTime) {
    return a.sortTime - b.sortTime;
  }

  if (a.sortTime === null && b.sortTime !== null) return -1;
  if (a.sortTime !== null && b.sortTime === null) return 1;

  const typeOrderDifference = getTimelineItemTypeOrder(a) - getTimelineItemTypeOrder(b);
  if (typeOrderDifference !== 0) {
    return typeOrderDifference;
  }

  return a.key.localeCompare(b.key);
}

function compareTimelineItemDates(a: ChatTimelineItem, b: ChatTimelineItem) {
  if (a.date && b.date) {
    const aDateKey = formatDateKey(a.date);
    const bDateKey = formatDateKey(b.date);

    if (aDateKey !== bDateKey) {
      return aDateKey < bDateKey ? -1 : 1;
    }

    return 0;
  }

  if (!a.date && b.date) return -1;
  if (a.date && !b.date) return 1;
  return 0;
}

function getTimelineItemTypeOrder(item: ChatTimelineItem) {
  return item.type === "chat" ? 0 : 1;
}

function shouldShowTimelineDateDivider(
  item: ChatTimelineItem,
  previousItem: ChatTimelineItem | undefined,
) {
  if (!item.date) {
    return false;
  }

  if (!previousItem?.date) {
    return true;
  }

  return formatDateKey(item.date) !== formatDateKey(previousItem.date);
}

function getMealRecordSavedAt(mealRecord: Pick<MealRecordViewModel, "createdAt" | "updatedAt">) {
  const updatedAt = mealRecord.updatedAt?.trim();
  if (updatedAt) {
    return updatedAt;
  }

  const createdAt = mealRecord.createdAt?.trim();
  return createdAt || null;
}

function getMealRecordTimelineDate(mealRecord: MealRecordViewModel) {
  return parseDateKey(mealRecord.dateKey);
}

function getMealRecordSortDate(mealRecord: MealRecordViewModel) {
  const savedAt = getMealRecordSavedAt(mealRecord);
  const savedAtDate = savedAt ? parseDate(savedAt) : null;

  if (savedAtDate) {
    return getMealRecordDateWithSavedTime(mealRecord.dateKey, savedAtDate);
  }

  return getMealRecordFallbackDate(mealRecord);
}

function getMealRecordDateWithSavedTime(dateKey: string, savedAtDate: Date) {
  const date = parseDateKey(dateKey);
  const savedAtDateKey = formatDateKey(savedAtDate);
  const dayOffset = getDateKeyDayDifference(dateKey, savedAtDateKey);

  date.setDate(date.getDate() + dayOffset);
  date.setHours(
    savedAtDate.getHours(),
    savedAtDate.getMinutes(),
    savedAtDate.getSeconds(),
    savedAtDate.getMilliseconds(),
  );
  return date;
}

function getDateKeyDayDifference(fromDateKey: string, toDateKey: string) {
  const fromDate = parseDateKey(fromDateKey);
  const toDate = parseDateKey(toDateKey);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((toDate.getTime() - fromDate.getTime()) / millisecondsPerDay);
}

function getMealRecordFallbackDate(mealRecord: Pick<MealRecordViewModel, "dateKey" | "time">) {
  const date = parseDateKey(mealRecord.dateKey);

  switch (mealRecord.time) {
    case 0:
      date.setHours(8, 0, 0, 0);
      break;
    case 1:
      date.setHours(12, 0, 0, 0);
      break;
    case 2:
      date.setHours(18, 0, 0, 0);
      break;
    case 3:
      date.setHours(15, 0, 0, 0);
      break;
    case 4:
      date.setHours(22, 0, 0, 0);
      break;
    default:
      break;
  }

  return date;
}

// 문자열 날짜를 timestamp 숫자로 변환
function parseDateValue(value: Date | string | null | undefined) {
  const date = typeof value === "string" ? parseDate(value) : (value ?? null);
  return date ? date.getTime() : null;
}

function getServingUnitLabel(unitQuantity: string) {
  return unitQuantity.trim() === "인분" ? unitQuantity : "기준량";
}

function formatMenuServing(menu: FeedbackDto["menus"][number]) {
  return `1${getServingUnitLabel(menu.unit_quantity)} (${formatNumberWithMaxOneDecimal(menu.weight)}${menu.unit === 0 ? "g" : "ml"})`;
}

function resolveErrorMessage(
  error: unknown,
  fallbackMessage = "메시지 전송에 실패했어요. 잠시 후 다시 시도해주세요.",
) {
  if (error instanceof AppApiError && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function getSendMessageResponsePayload(
  response: ChatHistoryItemResponseDto | ChatRecommendResponseDto,
) {
  return "response_payload" in response ? response.response_payload : response;
}

function isMatchingHistoryChatItem(
  chatItem: ChatHistoryItemResponseDto,
  inputText: string,
  responsePayload: ChatRecommendResponseDto,
) {
  return (
    chatItem.input_text.trim() === inputText.trim() &&
    isSameChatResponsePayload(chatItem.response_payload, responsePayload)
  );
}

function isSameChatResponsePayload(
  left: ChatRecommendResponseDto,
  right: ChatRecommendResponseDto,
) {
  if (left.chat_category !== right.chat_category) {
    return false;
  }

  if (left.chat_category === "recommendation" && right.chat_category === "recommendation") {
    return areNumberArraysEqual(
      left.recommendations.map((menu) => menu.menu_id),
      right.recommendations.map((menu) => menu.menu_id),
    );
  }

  if (left.chat_category === "feedback" && right.chat_category === "feedback") {
    return areNumberArraysEqual(
      left.feedback.menus.map((menu) => menu.menu_id),
      right.feedback.menus.map((menu) => menu.menu_id),
    );
  }

  if (left.chat_category === "general" && right.chat_category === "general") {
    return left.general_answer === right.general_answer;
  }

  return false;
}

function areNumberArraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getAiCoachResponseAnalyticsProperties(response: ChatRecommendResponseDto) {
  if (response.chat_category === "recommendation") {
    return {
      menu_ids: response.recommendations.map((menu) => menu.menu_id),
      menu_names: response.recommendations.map((menu) => menu.menu_name),
      has_menu: response.recommendations.length > 0,
      chat_mode: "recommendation",
    };
  }

  if (response.chat_category === "feedback") {
    return {
      menu_ids: response.feedback.menus.map((menu) => menu.menu_id),
      menu_names: response.feedback.menus.map((menu) => menu.menu_name),
      has_menu: response.feedback.menus.length > 0,
      chat_mode: "feedback",
    };
  }

  return {
    menu_ids: [],
    menu_names: [],
    has_menu: false,
    chat_mode: "general",
  };
}
