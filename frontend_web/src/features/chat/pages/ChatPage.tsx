import { useActivity } from "@stackflow/react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import type {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  RefObject,
  TouchEvent,
} from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { navigateToChatCameraIfSupported } from "@/features/camera/utils/chatCameraSupport";
import { AssistantMessageText } from "@/features/chat/components/AssistantMessageText";
import { AssistantPendingMessage } from "@/features/chat/components/AssistantPendingMessage";
import type { ChatMealRecordMenu } from "@/features/chat/components/ChatMealRecordBottomSheet";
import {
  useParseMenusFromTextMutation,
  useSearchMenuMutation,
  useSendMessageMutation,
} from "@/features/chat/hooks/mutations/useSendMessageMutation";
import {
  ChatHistorySyncError,
  refetchAndResolveChatHistoryItem,
} from "@/features/chat/hooks/queries/chatHistoryCache";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import { useOpenChatMealRecordEditSheet } from "@/features/chat/stores/chatMealRecordEditSheet.store";
import {
  useChatMealRecordFocusRequest,
  useClearChatMealRecordFocusRequest,
} from "@/features/chat/stores/mealRecordFocus.store";
import styles from "@/features/chat/styles/ChatPage.module.css";
import { isChatHistoryItemResponse } from "@/features/chat/utils/chatHistoryItem";
import { consumeChatHistoryPlaybackBaselineIds } from "@/features/chat/utils/chatHistoryPlayback";
import {
  getCurrentMealTime,
  getMealTypeFromChatMealTime,
  getMealTypeFromCurrentTime,
} from "@/features/chat/utils/chatMeal";
import { getChatMealRecordBottomSheetPath } from "@/features/chat/utils/chatMealRecordBottomSheetPath";
import {
  getFeedbackDetailPath,
  getFeedbackResultPath,
  getRecommendDetailPath,
  getRecommendResultPath,
} from "@/features/chat/utils/recommendNavigation";
import { getTodayMealRecordMenus } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
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
import {
  type MenuDraftType,
  mergeMenuDraftMenus,
  useMenuDraftPrepareRegisterRequest,
} from "@/features/meal-record/stores/menuDraft.store";
import { toMenuDraftSeed } from "@/features/meal-record/utils/menuDraftSync";
import { PATH } from "@/router/path";
import { getMealSearchPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import {
  trackChatMenuSave,
  trackRecommendMenuCancel,
} from "@/shared/analytics/recommendMenuEvents";
import { AppApiError } from "@/shared/api/apiClient";
import { isNativeApp, requestNativeAppDeviceInfo } from "@/shared/api/bridge/nativeBridge";
import type { AppDeviceInfoPayload } from "@/shared/api/bridge/nativeBridge.types";
import { MEAL_TYPE_OPTIONS, type MealTime } from "@/shared/api/types/api.dto";
import type {
  ChatHistoryItemResponseDto,
  ChatNutritionLabelFeedbackResponseDto,
  ChatNutritionLabelMenuRegisteredResponseDto,
  ChatNutritionLabelRegisteredMenuDto,
  ChatRecommendItemResponseDto,
  ChatRecommendResponseDto,
  FeedbackItemDto,
} from "@/shared/api/types/api.response.dto";
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
import { formatBaseServingUnit, SERVING_UNIT_PERSON } from "@/shared/utils/servingUnit";

const QUICK_CHIP_LIST = [{ id: "meal-record", label: "식사 기록 모드" }];
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
const ASSISTANT_RESULT_REVEAL_DELAY_MS = 1000;
const ASSISTANT_RESULT_CARD_GAP_MS = 460;
const MEAL_RECORD_LOOKBACK_DAYS = 7;

type RecordedMenuSummary = {
  menu_id: number;
  menu_name: string;
  recordedCalories: number;
};

type MealRecordSnapshot = {
  time: MealTime;
  menus: MenuDraftType[];
};

type MealRecordViewModel = {
  dateKey: string;
  dayMeals: DayMealSummary;
  image?: string;
  time: MealTime;
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

type ChatNutritionLabelFeedbackItem = ChatHistoryItemResponseDto & {
  response_payload:
    | ChatNutritionLabelFeedbackResponseDto
    | ChatNutritionLabelMenuRegisteredResponseDto;
};

type MealRecordCancelTarget =
  | {
      type: "chatMenus";
      chatItem: ChatHistoryItemResponseDto;
      mealRecordMenus?: ChatMealRecordMenu[];
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

type AssistantBubbleGroup = {
  key: string;
  message: string;
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
  const openChatMealRecordEditSheet = useOpenChatMealRecordEditSheet();
  const todayDateKey = getTodayFormatDateKey();
  const mainRef = useRef<HTMLElement>(null);
  const endAnchorRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
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
  const [pendingMealRecordInput, setPendingMealRecordInput] = useState<string | null>(null);
  const [assistantPlayback, setAssistantPlayback] = useState<AssistantPlaybackState | null>(null);
  const [chatCameraUpdateUrl, setChatCameraUpdateUrl] = useState<string | null>(null);
  const [isChatCameraUpdateModalOpen, setIsChatCameraUpdateModalOpen] = useState(false);
  const [isCameraHintDismissed, setIsCameraHintDismissed] = useState(
    getIsCameraHintDismissedInSession,
  );
  const [isScrolledAwayFromBottom, setIsScrolledAwayFromBottom] = useState(false);
  const [mealRecordCancelTarget, setMealRecordCancelTarget] =
    useState<MealRecordCancelTarget | null>(null);
  const [timelineScrollTarget, setTimelineScrollTarget] = useState<TimelineScrollTarget | null>(
    null,
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const isMealRecordTextMode = selectedChipId === "meal-record";
  const clientOsName = useClientOsName();
  const isSoftKeyboardVisible = useSoftKeyboardVisible(isInputFocused, clientOsName);

  const { data, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { mutateAsync: sendMessageMutation, isPending: isSendPending } = useSendMessageMutation();
  const { mutateAsync: parseMenusFromTextMutation, isPending: isMealRecordParsePending } =
    useParseMenusFromTextMutation();
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isDiaryMealRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const { mutateAsync: deleteDiaryMealRecordMutate, isPending: isDiaryMealDeletePending } =
    useTodayMealRecordDeleteWithRollbackMutation();
  const prepareRegisterRequest = useMenuDraftPrepareRegisterRequest();
  const chatMealRecordFocusRequest = useChatMealRecordFocusRequest();
  const clearChatMealRecordFocusRequest = useClearChatMealRecordFocusRequest();

  const isMealRecordEditPending = isDiaryMealRegisterPending || isDiaryMealDeletePending;

  const buildMealRecordDraftRequest = ({
    dateKey,
    dayMeals,
    image,
    mealTime,
    menus,
  }: {
    dateKey: string;
    dayMeals: DayMealSummary;
    image?: string;
    mealTime: MealTime;
    menus: MenuDraftType[];
  }) => {
    const mealType = getMealTypeFromChatMealTime(mealTime);

    return prepareRegisterRequest({
      dateKey,
      mealType,
      menus,
      image,
      mealTime: dayMeals.mealRecordMealTimesByTime[mealTime],
    });
  };

  const chatList = useMemo(() => {
    const rawList = data?.chat_list ?? [];
    return rawList.filter(isChatHistoryItemResponse).sort(compareChatHistoryItems);
  }, [data]);
  const displayChatList = chatList;
  const hasTodayDisplayChat = useMemo(
    () => displayChatList.some((chatItem) => getChatDateKey(chatItem) === todayDateKey),
    [displayChatList, todayDateKey],
  );
  const mealRecordDateKeys = useMemo(
    () => getRecentDateKeys(todayDateKey, MEAL_RECORD_LOOKBACK_DAYS),
    [todayDateKey],
  );
  const dayMealQueries = useQueries({
    queries: mealRecordDateKeys.map((dateKey) => ({
      queryKey: homeQueryKeys.dayMeals.byDate(dateKey),
      queryFn: () => getTodayMealRecordMenus(dateKey),
      staleTime: Infinity,
    })),
  });
  const dayMealsByDate = useMemo(() => {
    const dayMeals = new Map<string, DayMealSummary>();

    mealRecordDateKeys.forEach((dateKey, index) => {
      const queryData = dayMealQueries[index]?.data;

      if (queryData) {
        dayMeals.set(dateKey, queryData);
      }
    });

    return dayMeals;
  }, [mealRecordDateKeys, dayMealQueries]);
  const timelineMealRecords = useMemo(() => {
    return mealRecordDateKeys.flatMap((dateKey) => {
      const dayMeals = dayMealsByDate.get(dateKey);

      if (!dayMeals) {
        return [];
      }

      return getDateMealRecordViewModels(dayMeals, dateKey);
    });
  }, [mealRecordDateKeys, dayMealsByDate]);
  const timelineItems = useMemo(
    () => buildChatTimelineItems(displayChatList, timelineMealRecords),
    [displayChatList, timelineMealRecords],
  );
  const timelineSignature = useMemo(
    () => timelineItems.map((item) => `${item.key}:${item.sortTime ?? "unknown"}`).join("|"),
    [timelineItems],
  );
  const isMealRecordTimelinePending = dayMealQueries.some((query) => query.isPending);
  const isTimelineDataPending = isHistoryPending || isMealRecordTimelinePending;
  const assistantPlaybackSignature = assistantPlayback
    ? [
        assistantPlayback.chatItemId,
        assistantPlayback.visibleBubbleCount,
        assistantPlayback.resultVisibleCount,
      ].join(":")
    : "idle";
  const isAssistantPlaybackActive = assistantPlayback !== null;
  const isChatSendDisabled = isSendPending || isAssistantPlaybackActive || isMealRecordParsePending;
  const isAwaitingChatResponse =
    pendingInput !== null || pendingMealRecordInput !== null || isAssistantPlaybackActive;
  const hasTimelineContent = timelineItems.length > 0 || isAwaitingChatResponse;
  const isTypingPending = isAwaitingChatResponse && isSendPending;
  const isInputEmpty = inputValue.trim().length === 0;
  const isQuickActionVisible = isInputEmpty && !isSoftKeyboardVisible && !isAwaitingChatResponse;
  const shouldDeferTimelineRender = pendingInput === null && isTimelineDataPending;
  const shouldRenderTimeline = hasTimelineContent && !shouldDeferTimelineRender;
  const shouldShowTimelineSkeleton = shouldDeferTimelineRender;
  const shouldShowEmptySection = !hasTimelineContent && !isTimelineDataPending;
  const isScrollToBottomButtonVisible = shouldRenderTimeline && isScrolledAwayFromBottom;
  const isFloatingButtonVisible =
    !isSoftKeyboardVisible && (isQuickActionVisible || isScrollToBottomButtonVisible);
  const shouldShowCameraHint =
    !isHistoryPending &&
    !hasTodayDisplayChat &&
    !isScrollToBottomButtonVisible &&
    !isCameraHintDismissed;
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

      if (behavior === "smooth") {
        return;
      }

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

  useLayoutEffect(() => {
    if (!shouldRenderTimeline) {
      updateIsScrolledAwayFromBottom();
      return;
    }

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
    shouldRenderTimeline,
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
      (pendingInput === null && pendingMealRecordInput === null) ||
      !isTop ||
      pendingMealRecordScrollKeyRef.current !== null ||
      timelineScrollTarget !== null
    ) {
      return;
    }

    keepBottomIfFollowing("instant");
  }, [isTop, keepBottomIfFollowing, pendingInput, pendingMealRecordInput, timelineScrollTarget]);

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
    pendingMealRecordInput,
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
      const shouldRevealResultBeforeBubbles = isNutritionLabelMenuNotFoundPayload(responsePayload);
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

      if (shouldRevealResultBeforeBubbles && resultRevealCount > 0) {
        await delayAssistantPlayback(ASSISTANT_BUBBLE_REVEAL_START_DELAY_MS);
        if (!isCurrentPlayback()) return;

        updateResultVisibleCount(1);

        if (bubbleRevealCount > 0) {
          await delayAssistantPlayback(ASSISTANT_RESULT_CARD_GAP_MS);
        }
      }

      if (bubbleRevealCount > 0) {
        if (!shouldRevealResultBeforeBubbles) {
          await delayAssistantPlayback(ASSISTANT_BUBBLE_REVEAL_START_DELAY_MS);
          if (!isCurrentPlayback()) return;
        }

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

      if (!shouldRevealResultBeforeBubbles && resultRevealCount > 0) {
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
    const playbackBaselineChatIds = consumeChatHistoryPlaybackBaselineIds(queryClient);

    if (playbackBaselineChatIds !== null) {
      knownHistoryChatItemIdsRef.current = new Set(playbackBaselineChatIds);
    }

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
  }, [
    assistantPlayback,
    chatList,
    isHistoryPending,
    isTop,
    pendingInput,
    queryClient,
    playAssistantResponse,
  ]);

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
    setPendingInput(text);
    setInputValue("");
    track(EVENT_NAME.AI_COACH_CHAT, { input_length: text.length });

    try {
      const previousChatItemIds = new Set(chatList.map((chatItem) => chatItem.id));
      const responsePayload = await sendMessageMutation({ input: text });
      const responseChatItem = await refetchAndResolveChatHistoryItem(queryClient, {
        match: (chatItem) =>
          !previousChatItemIds.has(chatItem.id) && chatItem.input_text.trim() === text,
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

  const sendMealRecordText = async (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || isChatSendDisabled) return;

    if (!isCameraHintDismissed) {
      setIsCameraHintDismissed(true);
      saveCameraHintDismissedInSession();
    }

    shouldFollowBottomRef.current = true;
    setPendingMealRecordInput(text);
    setInputValue("");

    try {
      await parseMenusFromTextMutation({ text });
      setPendingMealRecordInput(null);
    } catch (error) {
      setPendingMealRecordInput(null);
      toast.warning(
        resolveErrorMessage(
          error,
          "식사 기록 텍스트를 분석하지 못했어요. 잠시 후 다시 시도해주세요.",
        ),
      );
      setInputValue(text);
    }
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (isMealRecordTextMode) {
      await sendMealRecordText(inputValue);
      return;
    }

    await sendChatMessage(inputValue);
  };

  const handleBack = () => {
    if (isNativeApp()) {
      navigateBack();
      return;
    }

    navigateBack({ fallbackTo: PATH.HOME });
  };

  const handleInputValueChange = (nextValue: string) => {
    setInputValue(nextValue);
  };

  const handleInputFocusChange = (isFocused: boolean) => {
    setIsInputFocused(isFocused);
  };

  const handleScrollToBottom = () => {
    shouldFollowBottomRef.current = true;
    keepBottomIfFollowing("smooth");
  };

  const handleTimelineImageLoad = useCallback(() => {
    keepBottomIfFollowing("instant");
  }, [keepBottomIfFollowing]);

  const handleNavigateChatCamera = async () => {
    const result = await navigateToChatCameraIfSupported(navigate);

    if (!result.isSupported) {
      setChatCameraUpdateUrl(result.updateUrl);
      setIsChatCameraUpdateModalOpen(true);
    }
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
    overrideMealRecordMenus?: ChatMealRecordMenu[],
  ) => {
    const mealRecordMenus = overrideMealRecordMenus ?? getChatMealRecordMenus(meal);

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

    const hadMealRecord = getMealRecordDraftMenus(dayMeals, nextMealRecord.time).length > 0;
    const scrollTargetKey = prepareMealRecordScroll(dateKey, nextMealRecord.time);
    const request = buildMealRecordDraftRequest({
      dateKey,
      dayMeals,
      mealTime: nextMealRecord.time,
      menus: nextMealRecord.menus,
      image: mealRecord?.image ?? getMealRecordImage(dayMeals, nextMealRecord.time),
    });

    try {
      await registerDiaryMealRecordMutate(request, {
        onSuccess: () => {
          trackChatMenuSave(nextMealRecord.addedMenus);
        },
      });

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
    const mealType = getMealTypeFromChatMealTime(mealRecord.time);
    openChatMealRecordEditSheet({
      context: {
        dateKey: mealRecord.dateKey,
        dayMeals: mealRecord.dayMeals,
        image: mealRecord.image,
        menus: mealRecord.menus,
        previousMealRecord: mealRecord.previousMealRecord,
      },
      mealType,
    });
    navigate(getChatMealRecordBottomSheetPath(mealRecord.dateKey, mealType));
  };

  const handleChatMealRecordRemoveClick = async (
    meal: ChatHistoryItemResponseDto,
    mealRecord: MealRecordViewModel | null,
    overrideMealRecordMenus?: ChatMealRecordMenu[],
  ) => {
    const mealRecordMenus = overrideMealRecordMenus ?? getChatMealRecordMenus(meal);

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
          request: buildMealRecordDraftRequest({
            dateKey: mealRecord.dateKey,
            dayMeals: mealRecord.dayMeals,
            mealTime: previousMealRecord.time,
            menus: [],
            image: mealRecord.image,
          }),
          currentMenusByTime: mealRecord.dayMeals.menusByTime,
        });

        if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return;
        }

        trackRecommendMenuCancel(mealRecordMenus);
        toast.success("식사 기록에서 메뉴를 제거했어요.");
      } catch {
        toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    try {
      const scrollTargetKey = prepareMealRecordScroll(mealRecord.dateKey, previousMealRecord.time);

      await registerDiaryMealRecordMutate(
        buildMealRecordDraftRequest({
          dateKey: mealRecord.dateKey,
          dayMeals: mealRecord.dayMeals,
          mealTime: previousMealRecord.time,
          menus: remainingMenus,
          image: mealRecord.image,
        }),
      );

      trackRecommendMenuCancel(mealRecordMenus);
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
        request: buildMealRecordDraftRequest({
          dateKey: mealRecord.dateKey,
          dayMeals: mealRecord.dayMeals,
          mealTime: mealRecord.time,
          menus: [],
          image: mealRecord.image,
        }),
        currentMenusByTime: mealRecord.dayMeals.menusByTime,
      });

      if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
        toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      trackRecommendMenuCancel(mealRecord.menus);
      toast.success("식사 기록을 취소했어요.");
    } catch {
      toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleChatMealRecordCancelRequest = (
    chatItem: ChatHistoryItemResponseDto,
    mealRecord: MealRecordViewModel | null,
    overrideMealRecordMenus?: ChatMealRecordMenu[],
  ) => {
    if (!mealRecord) {
      return;
    }

    setMealRecordCancelTarget({
      type: "chatMenus",
      chatItem,
      mealRecordMenus: overrideMealRecordMenus,
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
        mealRecordCancelTarget.mealRecordMenus,
      );
      return;
    }

    await handleDiaryMealRecordCancelClick(mealRecordCancelTarget.mealRecord);
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} />

      <main ref={mainRef} className={styles.main}>
        {shouldShowEmptySection ? <EmptySection /> : null}
        {shouldShowTimelineSkeleton ? <ChatHistorySkeleton /> : null}

        {shouldRenderTimeline ? (
          <div className={styles.chatTimeline}>
            {timelineItems.map((timelineItem, index) => {
              // 현재 아이템과 이전 아이템의 날짜를 비교해 날짜 구분선 렌더링 결정
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
                        timeText={formatTimeText(getMealRecordUpdatedAt(mealRecord))}
                        onCancelClick={() => handleMealRecordCancelRequest(mealRecord)}
                        onEditClick={() => handleMealRecordEditClick(mealRecord)}
                      />
                    </div>
                  </section>
                );
              }

              const { chatItem } = timelineItem;
              const recordDateKey = getChatDateKey(chatItem) ?? todayDateKey;
              const recordedDayMeals = dayMealsByDate.get(recordDateKey);
              // 기존에 기록되어있는 식사 기록
              const currentMealRecord = recordedDayMeals
                ? getMealRecordViewModelByTime(recordedDayMeals, recordDateKey, currentMealTime)
                : null;
              const userImageUrl = chatItem.image_url ?? chatItem.response_payload.image_url ?? "";
              const assistantTimeText = formatTimeText(chatItem.createdAt);
              const chatItemPlayback =
                assistantPlayback?.chatItemId === chatItem.id ? assistantPlayback : null;
              const visibleBubbleCount =
                chatItemPlayback === null
                  ? Number.POSITIVE_INFINITY
                  : chatItemPlayback.visibleBubbleCount;
              const visibleResultCount =
                chatItemPlayback === null
                  ? Number.POSITIVE_INFINITY
                  : chatItemPlayback.resultVisibleCount;
              const nutritionLabelFeedback = getNutritionLabelFeedback(chatItem);
              const assistantBubbleGroups = getAssistantVisibleBubbleGroups(
                chatItem.response_payload,
                visibleBubbleCount,
              );
              const isResponseAnimating = chatItemPlayback !== null;
              const userImageAction =
                chatItem.response_payload.chat_category === "feedback" &&
                chatItem.response_payload.feedback
                  ? {
                      ariaLabel: "피드백 결과 보기",
                      onClick: () => navigate(getFeedbackResultPath(chatItem.id)),
                    }
                  : {
                      ariaLabel: "업로드 이미지 크게 보기",
                      onClick: () => setPreviewImageUrl(userImageUrl),
                    };
              const isMealRecorded = hasChatMealRecordMenus(chatItem, currentMealRecord);
              const nutritionResponsePayload = nutritionLabelFeedback?.response_payload;
              const nutritionMenuId = getNutritionMenuId(nutritionResponsePayload);
              const nutritionCardMenu = getNutritionCardMenu(nutritionResponsePayload);
              const isNutritionRegisteredChat = nutritionMenuId !== null;
              const isNutritionMealRecorded =
                typeof nutritionMenuId === "number" &&
                currentMealRecord?.previousMealRecord.menus.some(
                  (menu) => menu.id === nutritionMenuId,
                ) === true;
              const shouldHideUserMessage = isNutritionLabelMenuRegisteredActionPayload(
                chatItem.response_payload,
              );

              return (
                <section key={timelineItem.key} className={styles.conversationSection}>
                  {shouldShowDateDivider && timelineItem.date ? (
                    <div className={styles.dateDivider}>
                      <span className={`${styles.dateText} typo-caption4`}>
                        {formatDateDividerText(timelineItem.date)}
                      </span>
                    </div>
                  ) : null}

                  {!shouldHideUserMessage ? (
                    <div className={styles.userMessageGroup}>
                      <p className={`${styles.timeText} typo-caption4`}>
                        {formatTimeText(chatItem.createdAt)}
                      </p>
                      <div className={styles.userMessageContent}>
                        {!userImageUrl && (
                          <p className={`${styles.userBubble} typo-body2`}>{chatItem.input_text}</p>
                        )}
                        {userImageUrl && (
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
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.assistantMessageRow}>
                    <div className={styles.assistantMessageContent}>
                      {nutritionLabelFeedback &&
                      !isNutritionRegisteredChat &&
                      visibleResultCount >= 1 ? (
                        <MemuNotFoundCard
                          animate={isResponseAnimating}
                          chatItem={nutritionLabelFeedback}
                        />
                      ) : null}

                      {assistantBubbleGroups.map((bubbleGroup) => (
                        <AssistantMessageBubbles
                          key={bubbleGroup.key}
                          animate={isResponseAnimating}
                          message={bubbleGroup.message}
                          timeText={assistantTimeText}
                          visibleBubbleCount={bubbleGroup.visibleBubbleCount}
                        />
                      ))}

                      {chatItem.response_payload.chat_category === "recommendation" &&
                        chatItem.response_payload.recommendations && (
                          <RecommendationSection
                            chatId={chatItem.id}
                            animate={isResponseAnimating}
                            recommendations={chatItem.response_payload.recommendations}
                            visibleCardCount={visibleResultCount}
                            onMealRecordClick={() =>
                              handleMenuRecordClick(
                                chatItem,
                                recordDateKey,
                                recordedDayMeals,
                                currentMealRecord,
                              )
                            }
                            onMealRecordCancelClick={() =>
                              handleChatMealRecordCancelRequest(
                                chatItem,
                                isMealRecorded ? currentMealRecord : null,
                              )
                            }
                            isMealRecorded={isMealRecorded}
                          />
                        )}

                      {chatItem.response_payload.chat_category === "feedback" &&
                        chatItem.response_payload.feedback &&
                        visibleResultCount >= 1 && (
                          <FeedbackSection
                            chatId={chatItem.id}
                            animate={isResponseAnimating}
                            feedback={chatItem.response_payload.feedback}
                            hasImage={Boolean(userImageUrl)}
                            timeText={assistantTimeText}
                            onMealRecordClick={() =>
                              handleMenuRecordClick(
                                chatItem,
                                recordDateKey,
                                recordedDayMeals,
                                currentMealRecord,
                              )
                            }
                            onMealRecordCancelClick={() =>
                              handleChatMealRecordCancelRequest(
                                chatItem,
                                isMealRecorded ? currentMealRecord : null,
                              )
                            }
                            isMealRecorded={isMealRecorded}
                            onDirectMealRecordClick={handleNavigateDirectMenuRecord}
                          />
                        )}

                      {nutritionLabelFeedback &&
                      isNutritionRegisteredChat &&
                      visibleResultCount >= 1 ? (
                        <NutritionSection
                          animate={isResponseAnimating}
                          chatItem={nutritionLabelFeedback}
                          isMealRecorded={isNutritionMealRecorded}
                          meal={nutritionCardMenu}
                          menuId={nutritionMenuId}
                          onMealRecordClick={(meal) =>
                            handleMenuRecordClick(
                              chatItem,
                              recordDateKey,
                              recordedDayMeals,
                              currentMealRecord,
                              [meal],
                            )
                          }
                          onMealRecordCancelClick={(meal) =>
                            handleChatMealRecordCancelRequest(
                              chatItem,
                              isNutritionMealRecorded ? currentMealRecord : null,
                              [meal],
                            )
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}

            {pendingMealRecordInput !== null ? (
              <section className={styles.conversationSection} aria-live="polite">
                <div className={styles.userMessageGroup}>
                  <p className={`${styles.timeText} typo-caption4`}>{formatTimeText(new Date())}</p>
                  <p className={`${styles.userBubble} typo-body2`}>{pendingMealRecordInput}</p>
                </div>

                {isMealRecordParsePending ? <AssistantPendingMessage /> : null}
              </section>
            ) : null}

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

        <div className={styles.scrollBottomContainer}>
          {!isScrollToBottomButtonVisible && (
            <section className={`${styles.chipSection}`}>
              {QUICK_CHIP_LIST.map((chip) => {
                const isSelected = selectedChipId === chip.id;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    className={`${styles.chipContainer} ${isSelected ? styles.selectedChip : ""}`}
                    onClick={() => {
                      const isSelecting = selectedChipId !== chip.id;
                      setSelectedChipId(isSelecting ? chip.id : null);

                      if (isSelecting) {
                        textInputRef.current?.focus();
                      }
                    }}
                    aria-pressed={isSelected}
                  >
                    <p className="typo-body2">{chip.label}</p>
                    {isSelected && <SystemIcon name="close" size={18} />}
                  </button>
                );
              })}
            </section>
          )}

          {isFloatingButtonVisible && (
            <div className={styles.floatingCameraButtonWrapper}>
              {shouldShowCameraHint && (
                <div className={`${styles.fabBubble} typo-caption4`}>메뉴 찍기</div>
              )}
              <button
                type="button"
                className={`${styles.cameraButton} ${isScrollToBottomButtonVisible ? styles.scrollButton : ""}`}
                onClick={
                  isScrollToBottomButtonVisible ? handleScrollToBottom : handleNavigateChatCamera
                }
                aria-label={isScrollToBottomButtonVisible ? "맨 아래로 이동" : "촬영하기"}
              >
                {isScrollToBottomButtonVisible ? (
                  <SystemIcon name="chevron-down-normal" size={24} />
                ) : (
                  <SystemIcon name="camera" size={32} />
                )}
              </button>
            </div>
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
          textInputRef={textInputRef}
          onChange={handleInputValueChange}
          onInputFocusChange={handleInputFocusChange}
          onDirectMenuRecordClick={handleNavigateDirectMenuRecord}
          onSubmit={handleSubmit}
          isMealRecordTextMode={isMealRecordTextMode}
        />
      </footer>

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
      <ChatCameraUpdateRequiredModal
        open={isChatCameraUpdateModalOpen}
        updateUrl={chatCameraUpdateUrl}
        onOpenChange={(open) => {
          setIsChatCameraUpdateModalOpen(open);
        }}
      />
      {previewImageUrl ? (
        <UserImagePreviewOverlay src={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      ) : null}
    </div>
  );
}

function delayAssistantPlayback(delayMs: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function getRecentDateKeys(baseDateKey: string, dayCount: number) {
  const baseDate = parseDateKey(baseDateKey);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - index);
    return formatDateKey(date);
  });
}

function getAssistantBubbleGroups(
  responsePayload: ChatRecommendResponseDto,
): AssistantBubbleGroup[] {
  const bubbleGroups: AssistantBubbleGroup[] = [];

  if (isNonEmptyMessage(responsePayload.intro_message)) {
    bubbleGroups.push({ key: "intro", message: responsePayload.intro_message });
  }

  if (
    responsePayload.chat_category === "general" &&
    isNonEmptyMessage(responsePayload.general_answer)
  ) {
    bubbleGroups.push({ key: "general", message: responsePayload.general_answer });
  }

  return bubbleGroups;
}

function isNonEmptyMessage(message: unknown): message is string {
  return typeof message === "string" && message.trim().length > 0;
}

function getNutritionLabelFeedback(
  chatItem: ChatHistoryItemResponseDto,
): ChatNutritionLabelFeedbackItem | null {
  if (isNutritionLabelFeedbackPayload(chatItem.response_payload)) {
    return chatItem as ChatNutritionLabelFeedbackItem;
  }

  return null;
}

function isNutritionLabelFeedbackPayload(
  responsePayload: ChatRecommendResponseDto,
): responsePayload is
  | ChatNutritionLabelFeedbackResponseDto
  | ChatNutritionLabelMenuRegisteredResponseDto {
  return (
    responsePayload.chat_category === "feedback" &&
    "recognized_nutrition" in responsePayload &&
    Boolean(responsePayload.recognized_nutrition)
  );
}

function getNutritionRegisteredMenu(
  responsePayload: ChatRecommendResponseDto | undefined,
): ChatNutritionLabelRegisteredMenuDto | null {
  if (!responsePayload || !isNutritionLabelFeedbackPayload(responsePayload)) {
    return null;
  }

  return responsePayload.registered_menu ?? null;
}

function getNutritionMenuId(responsePayload: ChatRecommendResponseDto | undefined) {
  const registeredMenuId = getNutritionRegisteredMenu(responsePayload)?.menu_id;

  if (typeof registeredMenuId === "number") {
    return registeredMenuId;
  }

  if (!responsePayload || !isNutritionLabelFeedbackPayload(responsePayload)) {
    return null;
  }

  return typeof responsePayload.menu_id === "number" ? responsePayload.menu_id : null;
}

function getNutritionCardMenu(
  responsePayload: ChatRecommendResponseDto | undefined,
): ChatMealRecordMenu | null {
  if (!responsePayload || !isNutritionLabelFeedbackPayload(responsePayload)) {
    return null;
  }

  const registeredMenu = getNutritionRegisteredMenu(responsePayload);

  if (registeredMenu) {
    return toChatMealRecordMenuFromRegisteredMenu(registeredMenu);
  }

  const menuId = getNutritionMenuId(responsePayload);

  if (
    menuId === null ||
    !("menu_name" in responsePayload) ||
    typeof responsePayload.menu_name !== "string"
  ) {
    return null;
  }

  return toChatMealRecordMenuFromNutrition({
    brand: "brand" in responsePayload ? responsePayload.brand : undefined,
    menuId,
    menuName: responsePayload.menu_name,
    nutrition: responsePayload.recognized_nutrition,
  });
}

function isNutritionLabelMenuNotFoundPayload(responsePayload: ChatRecommendResponseDto) {
  return (
    isNutritionLabelFeedbackPayload(responsePayload) && getNutritionMenuId(responsePayload) === null
  );
}

function isNutritionLabelMenuRegisteredActionPayload(
  responsePayload: ChatRecommendResponseDto,
): responsePayload is ChatNutritionLabelMenuRegisteredResponseDto {
  return (
    isNutritionLabelFeedbackPayload(responsePayload) &&
    "action" in responsePayload &&
    responsePayload.action === "nutrition_label_menu_registered"
  );
}

function getChatNutritionRegisterPath(chatId: number) {
  const params = new URLSearchParams({
    chatId: String(chatId),
  });

  return `${PATH.CHAT_NUTRITION_REGISTER}?${params.toString()}`;
}

function getChatNutritionDetailPath(chatId: number, menuId: number) {
  const params = new URLSearchParams({
    chatId: String(chatId),
    menuId: String(menuId),
  });

  return `${PATH.CHAT_NUTRITION_DETAIL}?${params.toString()}`;
}

function getAssistantVisibleBubbleGroups(
  responsePayload: ChatRecommendResponseDto,
  visibleBubbleCount: number,
) {
  let consumedBubbleCount = 0;

  return getAssistantBubbleGroups(responsePayload).map((bubbleGroup) => {
    const bubbleCount = getAssistantMessageBubbleCount(bubbleGroup.message);
    const groupVisibleBubbleCount = Math.max(
      0,
      Math.min(visibleBubbleCount - consumedBubbleCount, bubbleCount),
    );

    consumedBubbleCount += bubbleCount;

    return {
      ...bubbleGroup,
      visibleBubbleCount: groupVisibleBubbleCount,
    };
  });
}

function getAssistantBubbleRevealCount(responsePayload: ChatRecommendResponseDto) {
  return getAssistantBubbleGroups(responsePayload).reduce(
    (bubbleCount, bubbleGroup) => bubbleCount + getAssistantMessageBubbleCount(bubbleGroup.message),
    0,
  );
}

function getAssistantMessageBubbleCount(message: string) {
  return getAssistantMessageBubbleTexts(message).length;
}

function getAssistantMessageBubbleTexts(message: string) {
  return message.split(/\r?\n/).filter((bubbleMessage) => bubbleMessage.trim());
}

function getAssistantResultRevealCount(responsePayload: ChatRecommendResponseDto) {
  if (isNutritionLabelFeedbackPayload(responsePayload)) {
    return 1;
  }

  if (responsePayload.chat_category === "recommendation" && responsePayload.recommendations) {
    if (responsePayload.recommendations.length === 0) {
      return 0;
    }

    return responsePayload.recommendations.length > 1 ? 2 : 1;
  }

  if (responsePayload.chat_category === "feedback" && responsePayload.feedback) {
    return responsePayload.feedback.menus.length > 0 ? 1 : 0;
  }

  return 0;
}

function getMealRecordCancelDescription(target: MealRecordCancelTarget | null) {
  if (target?.type !== "chatMenus") {
    return "이 식사 기록을 취소할까요?";
  }

  const mealRecordMenus = target.mealRecordMenus ?? getChatMealRecordMenus(target.chatItem);

  return mealRecordMenus.length > 1
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
  textInputRef,
  onChange,
  onInputFocusChange,
  onDirectMenuRecordClick,
  onSubmit,
  isMealRecordTextMode,
}: {
  value: string;
  isInputEmpty: boolean;
  isSendPending: boolean;
  textInputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onInputFocusChange: (isFocused: boolean) => void;
  onDirectMenuRecordClick: () => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
  isMealRecordTextMode: boolean;
}) {
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const textInputContainerRef = useRef<HTMLFormElement>(null);
  const textInputWrapperRef = useRef<HTMLDivElement>(null);
  const lastPointerSubmitAtRef = useRef(0);
  const isSendDisabled = isInputEmpty || isSendPending;
  const [searchMenus, setSearchMenus] = useState<string[]>([]);
  const [menuSearchKeyword, setMenuSearchKeyword] = useState("");
  const searchKeyword = getTypingMenuKeyword(value);

  const { mutateAsync: searchMenu } = useSearchMenuMutation();

  const resizeTextInput = useCallback(() => {
    const textInput = textInputRef.current;
    if (!textInput) {
      return;
    }

    textInput.style.height = "auto";
    const scrollHeight = textInput.scrollHeight;
    textInput.style.height = `${scrollHeight}px`;

    const computedStyle = window.getComputedStyle(textInput);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight);
    const paddingTop = Number.parseFloat(computedStyle.paddingTop);
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom);
    const contentHeight =
      scrollHeight -
      (Number.isFinite(paddingTop) ? paddingTop : 0) -
      (Number.isFinite(paddingBottom) ? paddingBottom : 0);
    const nextIsMultiline =
      Number.isFinite(lineHeight) && lineHeight > 0 && contentHeight > lineHeight * 1.5;

    [textInputContainerRef.current, textInputWrapperRef.current, textInput].forEach((element) => {
      if (!element) {
        return;
      }

      if (nextIsMultiline) {
        element.dataset.multiline = "true";
        return;
      }

      delete element.dataset.multiline;
    });
  }, [textInputRef]);

  useLayoutEffect(() => {
    resizeTextInput();
  }, [resizeTextInput, value]);

  const handleInputChange = (nextValue: string) => {
    if (isAddActionOpen && nextValue.trim().length > 0) {
      setIsAddActionOpen(false);
    }

    const nextSearchKeyword = getTypingMenuKeyword(nextValue);

    onChange(nextValue);
    setMenuSearchKeyword(nextSearchKeyword);

    if (!isMealRecordTextMode || nextSearchKeyword.length === 0) {
      setSearchMenus([]);
    }
  };

  const handleInputFocus = () => {
    onInputFocusChange(true);
  };

  const handleInputBlur = () => {
    onInputFocusChange(false);
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

  const focusTextInput = (cursorPosition: number) => {
    const textInput = textInputRef.current;
    if (!textInput) {
      return;
    }

    textInput.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      const nextTextInput = textInputRef.current;
      if (!nextTextInput) {
        return;
      }

      nextTextInput.focus({ preventScroll: true });
      nextTextInput.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const selectSearchMenu = (menu: string) => {
    const userInput = replaceLastKeyword(value, searchKeyword, menu);
    const keywordIndex = searchKeyword.length > 0 ? value.lastIndexOf(searchKeyword) : -1;
    const cursorPosition = keywordIndex === -1 ? userInput.length : keywordIndex + menu.length;

    onChange(userInput);
    setMenuSearchKeyword("");
    setSearchMenus([]);
    focusTextInput(cursorPosition);
  };

  const handleSearchMenuTouchStart = (event: TouchEvent<HTMLLIElement>) => {
    event.preventDefault();
  };

  const handleSearchMenuTouchEnd = (event: TouchEvent<HTMLLIElement>, menu: string) => {
    event.preventDefault();
    selectSearchMenu(menu);
  };

  const handleSearchMenuMouseDown = (event: MouseEvent<HTMLLIElement>, menu: string) => {
    event.preventDefault();
    selectSearchMenu(menu);
  };

  const handleSearchMenuClick = (event: MouseEvent<HTMLLIElement>, menu: string) => {
    if (event.detail !== 0) {
      return;
    }

    selectSearchMenu(menu);
  };

  const handleSearchMenuKeyDown = (event: KeyboardEvent<HTMLLIElement>, menu: string) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    selectSearchMenu(menu);
  };

  useEffect(() => {
    if (!isMealRecordTextMode || menuSearchKeyword.length === 0) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void searchMenu({ text: menuSearchKeyword }).then((response) => {
        if (!isActive) {
          return;
        }

        setSearchMenus(response.name);
      });
    }, 200);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [menuSearchKeyword, isMealRecordTextMode, searchMenu]);

  return (
    <div className={styles.chatInputContainer}>
      {isMealRecordTextMode && searchMenus.length > 0 && (
        <ul className={styles.searchMenuList} role="listbox">
          {searchMenus.map((menuName) => (
            <li
              key={menuName}
              className={`${styles.searchMenuItem} typo-body2`}
              role="option"
              tabIndex={0}
              aria-selected="false"
              onTouchStart={handleSearchMenuTouchStart}
              onTouchEnd={(event) => handleSearchMenuTouchEnd(event, menuName)}
              onMouseDown={(event) => handleSearchMenuMouseDown(event, menuName)}
              onClick={(event) => handleSearchMenuClick(event, menuName)}
              onKeyDown={(event) => handleSearchMenuKeyDown(event, menuName)}
            >
              {menuName}
            </li>
          ))}
        </ul>
      )}
      <form ref={textInputContainerRef} className={styles.textInputContainer} onSubmit={onSubmit}>
        <button
          type="button"
          className={`${styles.plusIconContainer}`}
          onClick={() => setIsAddActionOpen((prev) => !prev)}
          aria-label={isAddActionOpen ? "추가 기능 닫기" : "추가 기능 열기"}
        >
          <SystemIcon
            name="circle-plus"
            size={32}
            mode="image"
            className={`${styles.plusIcon} ${isAddActionOpen ? styles.plusIconOpen : ""}`}
          />
        </button>

        <div ref={textInputWrapperRef} className={styles.textInputWrapper}>
          <textarea
            ref={textInputRef}
            rows={1}
            value={value}
            className={`${styles.textInput} typo-body2`}
            // placeholder="맥도날드에 왔는데 뭐 먹을까?"
            onChange={async (event) => {
              handleInputChange(event.target.value.slice(0, 500));
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
              <SystemIcon name="chevron-up-normal" size={32} />
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
          } else {
            onEditClick();
          }
        }}
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
          {topRecommendation.rank && (
            <span className={`${styles.rankBadge} typo-label6`}>{topRecommendation.rank}위</span>
          )}

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
                <span className={`${styles.recommendAmount} textNoWrap typo-label4`}>
                  {formatBaseServingUnit(topRecommendation.unit_quantity)} (
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
          aria-label="메뉴 목록 더보기"
          onClick={() => navigate(getRecommendResultPath(chatId))}
        >
          <p className={`${styles.textNormal} typo-body2`}>
            다른 메뉴도 있어요 (총 {recommendations.length}개)
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
  onDirectMealRecordClick,
}: {
  animate?: boolean;
  chatId: number;
  feedback: FeedbackItemDto;
  hasImage: boolean;
  timeText: string;
  onMealRecordClick: () => void;
  onMealRecordCancelClick: () => void;
  isMealRecorded: boolean;
  onDirectMealRecordClick: () => void;
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

      {hasImage && (
        <button className={styles.actionCard} onClick={onDirectMealRecordClick} type="button">
          <span className="typo-body2 textNormal">
            인식한 메뉴가 다르다면
            <br />
            직접 추가할 수 있어요
          </span>
          <SystemIcon name="chevron-right-normal" size={20} />
        </button>
      )}
    </div>
  );
}

function MemuNotFoundCard({
  animate = false,
  chatItem,
}: {
  animate?: boolean;
  chatItem: ChatNutritionLabelFeedbackItem;
}) {
  const navigate = useNavigate();

  const handleNutritionRegisterClick = () => {
    navigate(getChatNutritionRegisterPath(chatItem.id), {
      state: {
        ...chatItem.response_payload.recognized_nutrition,
        name: "",
        brand: "",
        entrySource: "chatNutritionLabel" as const,
        chatId: chatItem.id,
      },
    });
  };

  return (
    <section
      className={`${styles.menuNotFoundCard} ${animate ? styles.assistantResultCardAnimated : ""}`}
    >
      <img src="/icons/loading-3.svg" width={35} />
      <p className="typo-body2">
        영양성분을 인식했어요!
        <br />
        어떤 브랜드의 메뉴인가요?
      </p>
      <Button size="small" onClick={handleNutritionRegisterClick} fullWidth>
        메뉴명 입력하기
      </Button>
    </section>
  );
}

function NutritionSection({
  animate = false,
  chatItem,
  isMealRecorded,
  meal,
  menuId,
  onMealRecordCancelClick,
  onMealRecordClick,
}: {
  animate?: boolean;
  chatItem: ChatNutritionLabelFeedbackItem;
  isMealRecorded: boolean;
  meal: ChatMealRecordMenu | null;
  menuId: number;
  onMealRecordCancelClick: (meal: ChatMealRecordMenu) => void;
  onMealRecordClick: (meal: ChatMealRecordMenu) => void;
}) {
  const navigate = useNavigate();

  const handleNutritionDetailClick = () => {
    navigate(getChatNutritionDetailPath(chatItem.id, menuId));
  };

  const handleNutritionCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleNutritionDetailClick();
  };

  return (
    <section className={styles.feedbackSection}>
      <article
        className={`${styles.feedbackCard} ${isMealRecorded ? styles.cardSelected : ""} ${
          animate ? styles.assistantResultCardAnimated : ""
        }`}
        role="button"
        tabIndex={0}
        aria-label="등록한 메뉴 상세 보기"
        onClick={handleNutritionDetailClick}
        onKeyDown={handleNutritionCardKeyDown}
      >
        {meal ? (
          <NutritionCardContent
            meal={meal}
            isMealRecorded={isMealRecorded}
            onMealRecordCancelClick={onMealRecordCancelClick}
            onMealRecordClick={onMealRecordClick}
          />
        ) : (
          <NutritionCardError />
        )}
      </article>
    </section>
  );
}

function NutritionCardError() {
  return (
    <p className={`${styles.nutritionErrorText} typo-body2`}>메뉴 정보를 불러오지 못했어요.</p>
  );
}

function NutritionCardContent({
  meal,
  isMealRecorded,
  onMealRecordCancelClick,
  onMealRecordClick,
}: {
  meal: ChatMealRecordMenu;
  isMealRecorded: boolean;
  onMealRecordCancelClick: (meal: ChatMealRecordMenu) => void;
  onMealRecordClick: (meal: ChatMealRecordMenu) => void;
}) {
  const handleMealRecordClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    if (isMealRecorded) {
      onMealRecordCancelClick(meal);
      return;
    }

    onMealRecordClick(meal);
  };

  return (
    <div className={styles.recommendContents}>
      <p className={`${styles.recommendMenuName} typo-title2`}>{meal.menu_name}</p>
      <div className={styles.recommendMetaRow}>
        <p className={`${styles.menuInfoRow} typo-label4`}>
          {meal.brand && <span className={styles.recommendBrand}>{meal.brand}</span>}
          <span className={`${styles.recommendAmount} textNoWrap`}>{formatMenuServing(meal)}</span>
        </p>
        <span className={`${styles.recommendCalories} textNoWrap typo-title3`}>
          {formatNumberWithMaxOneDecimal(meal.calories)}kcal
        </span>
      </div>

      <div className={styles.recommendAction}>
        <Button
          size="small"
          fullWidth
          aria-pressed={isMealRecorded}
          onClick={handleMealRecordClick}
        >
          식사 기록
          {isMealRecorded ? (
            <SystemIcon name="check" size={16} className={styles.recommendActionIcon} />
          ) : (
            <SystemIcon name="plus" size={16} className={styles.recommendActionIcon} />
          )}
        </Button>
      </div>
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
  if (
    chatItem.response_payload.chat_category === "recommendation" &&
    chatItem.response_payload.recommendations
  ) {
    const topRecommendation = chatItem.response_payload.recommendations[0];
    return topRecommendation ? [topRecommendation] : [];
  }

  if (
    chatItem.response_payload.chat_category === "feedback" &&
    chatItem.response_payload.feedback
  ) {
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
  menus: MenuDraftType[];
  addedMenus: ChatMealRecordMenu[];
  wasAdded: boolean;
} {
  const time = mealRecord?.time ?? fallbackMealTime;
  const previousMenus = mealRecord ? mealRecord.menus : getMealRecordDraftMenus(dayMeals, time);
  const candidateMenus = getUniqueMealRecordMenus(mealRecordMenus);
  const candidateMenuIds = candidateMenus.map((menu) => menu.menu_id);
  const nextSelectedMenus = candidateMenus.map(toMenuDraftFromChatMealRecordMenu);
  const menus = mergeMenuDraftMenus({
    baseMenus: getMealRecordDraftMenus(dayMeals, time),
    overrideMenus: nextSelectedMenus,
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
  nextMenu: MenuDraftType,
  previousMenu: MenuDraftType | undefined,
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
): MenuDraftType[] {
  const removeMenuIdSet = new Set(removeMenuIds);
  return mealRecord.menus.filter((menu) => !removeMenuIdSet.has(menu.id));
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

function hasChatMealRecordMenus(
  chatItem: ChatHistoryItemResponseDto,
  mealRecord: MealRecordViewModel | null,
) {
  if (!mealRecord) {
    return false;
  }

  const chatMenuIds = getChatMealRecordMenus(chatItem).map((menu) => menu.menu_id);

  if (chatMenuIds.length === 0) {
    return false;
  }

  const recordedMenuIds = new Set(mealRecord.previousMealRecord.menus.map((menu) => menu.id));

  return chatMenuIds.every((menuId) => recordedMenuIds.has(menuId));
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

  const selectedMenus = getMealRecordDraftMenus(dayMeals, mealTime);

  return {
    dateKey,
    dayMeals,
    image: getMealRecordImage(dayMeals, mealTime),
    time: mealTime,
    updatedAt: dayMeals.mealRecordTimestampsByTime?.[mealTime]?.updatedAt,
    menus: menus.map(toChatMealRecordMenu),
    recordedMenus: menus.map(toRecordedMenuSummary),
    previousMealRecord: {
      time: mealTime,
      menus: selectedMenus,
    },
  };
}

function getMealRecordDraftMenus(dayMeals: DayMealSummary, mealTime: MealTime) {
  return dayMeals.menusByTime?.[mealTime]?.map(toMenuDraftSeed) ?? [];
}

function getMealRecordImage(dayMeals: DayMealSummary, mealTime: MealTime) {
  const image = dayMeals.imagesByTime?.[mealTime];
  return typeof image === "string" && image.trim().length > 0 ? image : undefined;
}

function toMenuDraftFromChatMealRecordMenu(menu: ChatMealRecordMenu): MenuDraftType {
  return {
    id: menu.menu_id,
    quantity: menu.weight,
    mode: "unit",
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

function toChatMealRecordMenuFromRegisteredMenu(
  registeredMenu: ChatNutritionLabelRegisteredMenuDto,
): ChatMealRecordMenu {
  return toChatMealRecordMenuFromNutrition({
    brand: registeredMenu.brand,
    menuId: registeredMenu.menu_id,
    menuName: registeredMenu.menu_name,
    nutrition: registeredMenu.registered_nutrition,
  });
}

function toChatMealRecordMenuFromNutrition({
  brand,
  menuId,
  menuName,
  nutrition,
}: {
  brand?: string | null;
  menuId: number;
  menuName: string;
  nutrition: ChatNutritionLabelRegisteredMenuDto["registered_nutrition"];
}): ChatMealRecordMenu {
  return {
    menu_id: menuId,
    menu_name: menuName,
    brand: brand ?? undefined,
    unit: toFiniteNumber(nutrition.unit),
    weight: toFiniteNumber(nutrition.weight),
    unit_quantity: SERVING_UNIT_PERSON,
    calories: toFiniteNumber(nutrition.calories),
  };
}

function toFiniteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

  return {
    type: "mealRecord",
    key: getMealRecordTimelineItemKey(mealRecord.dateKey, mealRecord.time),
    date,
    sortTime: parseDateValue(date),
    mealRecord,
  };
}

function getMealRecordTimelineItemKey(dateKey: string, mealTime: MealTime) {
  return `meal-record-${dateKey}-${mealTime}`;
}

function compareChatTimelineItems(a: ChatTimelineItem, b: ChatTimelineItem) {
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

function getMealRecordUpdatedAt(mealRecord: Pick<MealRecordViewModel, "updatedAt">) {
  const updatedAt = mealRecord.updatedAt?.trim();
  return updatedAt || null;
}

function getMealRecordTimelineDate(mealRecord: MealRecordViewModel) {
  const updatedAt = getMealRecordUpdatedAt(mealRecord);
  return updatedAt ? parseDate(updatedAt) : null;
}

// 문자열 날짜를 timestamp 숫자로 변환
function parseDateValue(value: Date | string | null | undefined) {
  const date = typeof value === "string" ? parseDate(value) : (value ?? null);
  return date ? date.getTime() : null;
}

type MenuServingInfo = {
  unit: number;
  unit_quantity?: string | null;
  weight: number;
};

function formatMenuServing(menu: MenuServingInfo) {
  return `${formatBaseServingUnit(menu.unit_quantity)} (${formatNumberWithMaxOneDecimal(menu.weight)}${menu.unit === 0 ? "g" : "ml"})`;
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

function getAiCoachResponseAnalyticsProperties(response: ChatRecommendResponseDto) {
  if (response.chat_category === "recommendation" && response.recommendations) {
    return {
      menu_ids: response.recommendations.map((menu) => menu.menu_id),
      menu_names: response.recommendations.map((menu) => menu.menu_name),
      has_menu: response.recommendations.length > 0,
      chat_mode: "recommendation",
    };
  }

  if (response.chat_category === "feedback" && response.feedback) {
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

function getTypingMenuKeyword(text: string) {
  const parts = text
    .trimEnd()
    .split(/[\s,，.、/]+|랑|하고|그리고|또|와|과/g)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) ?? "";
}

function replaceLastKeyword(text: string, keyword: string, selectedMenuName: string) {
  if (keyword.length === 0) {
    return text;
  }

  const index = text.lastIndexOf(keyword);

  if (index === -1) {
    return text;
  }

  return `${text.slice(0, index)}${selectedMenuName}${text.slice(index + keyword.length)}`;
}
