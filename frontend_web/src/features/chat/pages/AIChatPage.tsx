import { Menu } from "@base-ui/react";
import { useActivity } from "@stackflow/react";
import { useIsMutating } from "@tanstack/react-query";
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { MODE } from "@/features/camera/constants/camera.constant";
import { getAnalyticsErrorMessage } from "@/features/camera/utils/cameraCapture";
import { AssistantMessageText } from "@/features/chat/components/AssistantMessageText";
import { AssistantPendingMessage } from "@/features/chat/components/AssistantPendingMessage";
import { ImageAnalysisFlow } from "@/features/chat/components/ImageAnalysisFlow";
import { CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY } from "@/features/chat/constants/mealRecordModeOnboarding";
import { useRegisterChatMealMutation } from "@/features/chat/hooks/mutations/useRegisterMeal.mutation";
import {
  chatMutationKeys,
  useMealFeedbackMutation,
  useParseMenusFromTextMutation,
  usePendingSendMessages,
  usePersonalizedManagementMutation,
  useSendMessageMutation,
} from "@/features/chat/hooks/mutations/useSendMessageMutation";
import {
  useGetChatHistoryQuery,
  useRecentDayMealsQuery,
  useSearchMenuQuery,
} from "@/features/chat/hooks/queries/useGetChatQuery";
import { useDebounceValue } from "@/features/chat/hooks/useDebounceValue";
import { useGetImage, useSetImage } from "@/features/chat/stores/camera.store";
import styles from "@/features/chat/styles/AIChatPage.module.css";
import type { ChatGalleryMode } from "@/features/chat/types/camera.type";
import { getCurrentDateTime } from "@/features/chat/utils/date.util";
import { textSplitByLines } from "@/features/chat/utils/textdivider.util";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import { useTodayMealRecordDeleteMutation } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { getMenuSelectionMenuDetailPath } from "@/features/menu-selection/utils/menuSelectionRoutes";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { trackChatTextMenuSave, trackScanMenuSave } from "@/shared/analytics/menuSaveEvent.util";
import { requestNativeGalleryPick } from "@/shared/api/bridge/nativeBridge";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";
import type { MealType } from "@/shared/api/types/api.dto";
import type { MealTime } from "@/shared/api/types/api.request.dto";
import type {
  ChatHistoryItemResponseDto,
  ChatRecommendResponseDto,
} from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import { MEAL_TIMES } from "@/shared/constants/meal.constants";
import { useLocation, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import {
  formatDateDividerText,
  formatDateKey,
  formatTimeText,
  parseDate,
} from "@/shared/utils/dateFormat";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";
import { mealTimeNumberToLabel } from "@/shared/utils/timeformat";

interface ResponseWait {
  chatId: number;
  finish: () => void;
}

type ChatEntryRequest = { type: "meal-feedback"; dateKey: string } | { type: "management" };

export default function AIChatPage() {
  const navigate = useNavigate();
  const { id: screenId, isActive } = useActivity();
  const { state: entryRequest } = useLocation<ChatEntryRequest>();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const hasRequestedRef = useRef(false);

  const cameraImage = useGetImage();
  const setImage = useSetImage();

  const [isShowChatActions, setIsShowChatActions] = useState<boolean>(true);
  const [isTextMealRecordMode, setIsTextMealRecordMode] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState<boolean>(false);
  const [responseWait, setResponseWait] = useState<ResponseWait | null>(null);
  const [typingKeyword, setTypingKeyword] = useState("");
  const [nutritionMealChatId, setNutritionMealChatId] = useState<number | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const historyQuery = useGetChatHistoryQuery();
  const mealsQuery = useRecentDayMealsQuery();
  const { mutate: sendMessage } = useSendMessageMutation();
  const {
    mutate: sendTextMealRecord,
    data: textMealData,
    reset: resetSendTextMeal,
  } = useParseMenusFromTextMutation();
  const { mutate: registerMeal, isPending: isSavingMeal } = useRegisterChatMealMutation();
  const isChatRequestPending = useIsMutating({ mutationKey: chatMutationKeys.all }) > 0;
  const { mutate: requestMealFeedback } = useMealFeedbackMutation();
  const { mutate: requestPersonalizedManagement } = usePersonalizedManagementMutation();

  const isTimelinePending = historyQuery.isPending || mealsQuery.isPending;
  const isChatBusy = isChatRequestPending || cameraImage !== null;
  const debouncedKeyword = useDebounceValue(typingKeyword, 300);
  const canAutoCompleteKeyword =
    isTextMealRecordMode &&
    !isChatBusy &&
    inputMessage.trim() !== "" &&
    typingKeyword === debouncedKeyword;
  const { data: suggestionsResponse } = useSearchMenuQuery(debouncedKeyword, {
    enabled: canAutoCompleteKeyword,
  });
  const suggestionsMenuNames = canAutoCompleteKeyword ? (suggestionsResponse?.name ?? []) : [];
  const nutritionResponse = historyQuery.data?.chat_list.find(
    (chat) => chat.id === nutritionMealChatId,
  )?.response_payload;
  const nutritionRegisteredMenu =
    nutritionResponse && "registered_menu" in nutritionResponse
      ? nutritionResponse.registered_menu
      : null;
  const mealTimeCard = textMealData
    ? {
        source: "text" as const,
        chatId: textMealData.chat_id,
        initMealTime: String(textMealData.time ?? getCurrentDateTime().mealTime) as MealType,
      }
    : nutritionMealChatId !== null && nutritionRegisteredMenu
      ? {
          source: "nutrition" as const,
          chatId: nutritionMealChatId,
          initMealTime: getCurrentDateTime().mealTime,
        }
      : null;

  const handleTextMealRecordAction = () => {
    const nextMode = !isTextMealRecordMode;
    setIsTextMealRecordMode(nextMode);

    if (nextMode) {
      setIsShowChatActions(false);
      textareaRef.current?.focus();
    }
  };
  const handleScrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollEndRef.current?.scrollIntoView({ behavior });
  };
  const handleChangeMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;

    setInputMessage(text);
    setTypingKeyword(getTypingKeyword(text));
  };
  const handleGoToMealRecord = () => {
    const { dateKey, mealTime } = getCurrentDateTime();
    navigate(getMealRecordPath(dateKey, mealTime));
  };
  const handleSendMessage = () => {
    const formattedMessage = inputMessage.trim();
    if (!formattedMessage) return;

    setInputMessage("");

    if (isTextMealRecordMode) {
      sendTextMealRecord(
        { input: formattedMessage },
        {
          onSuccess: () => {
            setIsTextMealRecordMode(false);
            setNutritionMealChatId(null);
          },
          onError: () => {
            setInputMessage(formattedMessage);
          },
        },
      );
      return;
    }

    sendMessage(
      { input: formattedMessage },
      {
        onError: () => {
          setInputMessage(formattedMessage);
          toast.error("연결이 일시적으로 불안정해요. 다시 시도해주세요.");
        },
      },
    );
  };
  const waitForResponse = useCallback((chatId: number) => {
    return new Promise<void>((resolve) => {
      setResponseWait({
        chatId,
        finish: () => {
          resolve();
          setResponseWait((current) => (current?.chatId === chatId ? null : current));
        },
      });
    });
  }, []);
  const handleMealRecord = ({
    mealTime,
    source,
  }: {
    mealTime: MealType;
    source: "text" | "nutrition";
  }) => {
    if (isSavingMeal || !isActive) return;

    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;

    const { dateKey: currentDate } = getCurrentDateTime();

    let request: Parameters<typeof registerMeal>[0];
    let onSaved: () => void;

    if (source === "text") {
      if (!textMealData) return;

      const parseMenus = textMealData.menu_ids.map((id, index) => ({
        menu_id: id,
        menu_name: textMealData.menu_names[index],
        menu_weight: textMealData.menu_quantities[index],
      }));

      request = {
        dateKey: textMealData.date ?? currentDate,
        mealTime,
        menus: parseMenus.map(({ menu_id, menu_weight }) => ({
          id: menu_id,
          quantity: menu_weight,
          mode: "weight" as const,
        })),
        screen,
      };
      onSaved = () => {
        trackChatTextMenuSave(parseMenus);
        resetSendTextMeal();
      };
    } else {
      if (nutritionMealChatId === null || !nutritionRegisteredMenu) return;

      request = {
        dateKey: currentDate,
        mealTime,
        menus: [
          {
            id: nutritionRegisteredMenu?.menu_id,
            quantity: nutritionRegisteredMenu?.registered_nutrition.weight,
            mode: "weight",
          },
        ],
        screen,
      };
      onSaved = () => {
        trackScanMenuSave({
          menus: [
            {
              menu_id: nutritionRegisteredMenu.menu_id,
              menu_name: nutritionRegisteredMenu.menu_name,
            },
          ],
          scanType: "photo",
          source: "chat_tab",
        });
        closeMealTimeCard(nutritionMealChatId);
      };
    }

    registerMeal(request, {
      onSuccess: () => {
        if (!screen.isActive()) return;
        onSaved();
      },
      onError: (error) => {
        if (isRequestAbortError(error) || !screen.isActive()) return;

        toast.error("식사 기록을 저장하지 못했어요. 다시 시도해주세요.");
      },
    });
  };
  const handleAutoCompleteKeywords = (suggestionKeyword: string) => {
    const keyword = getTypingKeyword(inputMessage);
    if (!keyword) return;

    const index = inputMessage.lastIndexOf(keyword);
    if (index === -1) return;

    const nextMessage =
      inputMessage.slice(0, index) + suggestionKeyword + inputMessage.slice(index + keyword.length);

    setInputMessage(nextMessage);
    setTypingKeyword("");

    textareaRef.current?.focus({ preventScroll: true });

    requestAnimationFrame(() => {
      const cursorPosition = index + suggestionKeyword.length;

      textareaRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    });
  };
  const closeMealTimeCard = (chatId: number) => {
    setNutritionMealChatId((current) => (current === chatId ? null : current));
  };
  const handlePickGalleryImage = async (mode: ChatGalleryMode) => {
    if (isPickingImage || isChatBusy || !isActive) return;

    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;

    setIsPickingImage(true);

    try {
      const image = await requestNativeGalleryPick();

      screen.assertActive();

      setImage({ image, mode });
    } catch (error) {
      if (isRequestAbortError(error) || !screen.isActive()) return;

      const errorCode =
        typeof error === "object" && error !== null && "error" in error ? error.error : undefined;

      if (errorCode === "GALLERY_PICK_CANCELLED") return;

      toast.error(
        errorCode === "GALLERY_PERMISSION_DENIED"
          ? "사진 접근 권한이 필요해요. 설정에서 권한을 허용해 주세요."
          : getAnalyticsErrorMessage(error, "사진을 가져오지 못했어요. 다시 선택해 주세요."),
      );
    } finally {
      setIsPickingImage(false);
    }
  };

  useEffect(() => {
    const target = scrollEndRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollToBottomBtn(!entry.isIntersecting);
      },
      { threshold: 0.5 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isTimelinePending]);

  useEffect(() => {
    if (!isActive || !entryRequest) return;
    if (!historyQuery.isSuccess || isTimelinePending) return;

    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    if (entryRequest.type === "meal-feedback") {
      requestMealFeedback(entryRequest.dateKey);
    } else {
      requestPersonalizedManagement();
    }
  }, [
    isActive,
    entryRequest,
    historyQuery.isSuccess,
    isTimelinePending,
    requestMealFeedback,
    requestPersonalizedManagement,
  ]);

  useLayoutEffect(() => {
    if (isTimelinePending) return;

    handleScrollToBottom("auto");
  }, [isTimelinePending, cameraImage?.id, mealTimeCard?.chatId, isSavingMeal]);

  if (isChatBusy && isShowChatActions) {
    setIsShowChatActions(false);
  }

  return (
    <div className={`page ${styles.root}`}>
      <header className={styles.header}>
        <PageHeader onBack={() => navigateBack()} />
      </header>

      <main className={`main ${styles.content}`} onClick={() => setIsShowChatActions(false)}>
        {!isTimelinePending && (
          <ChatHistory
            history={historyQuery.data?.chat_list ?? []}
            mealRecords={mealsQuery.data}
            onScrollToBottomAction={handleScrollToBottom}
            responseWait={responseWait}
          />
        )}

        {cameraImage && (
          <ImageAnalysisFlow
            key={cameraImage.id}
            enabled={historyQuery.isSuccess && !isTimelinePending}
            waitForResponse={waitForResponse}
            onNutritionAnalyzed={(chatId) => {
              resetSendTextMeal();
              setNutritionMealChatId(chatId);
            }}
          />
        )}

        {mealTimeCard && (
          <section
            key={`${mealTimeCard.source}-${mealTimeCard.chatId}`}
            className={styles.conversation}
          >
            <div className={styles.messageArea} data-owner="ai">
              <MealTimeSelectCard
                initMealTime={mealTimeCard.initMealTime}
                disabled={isSavingMeal}
                onConfirm={(mealTime) => {
                  handleMealRecord({
                    mealTime,
                    source: mealTimeCard.source,
                  });
                }}
                onDismiss={() => {
                  if (mealTimeCard.source === "text") {
                    resetSendTextMeal();
                  } else {
                    closeMealTimeCard(mealTimeCard.chatId);
                  }
                }}
              />
            </div>
          </section>
        )}

        {isSavingMeal && (
          <section className={styles.conversation}>
            <div className={styles.messageArea} data-owner="ai">
              <AssistantPendingMessage />
            </div>
          </section>
        )}

        <div ref={scrollEndRef} />
        <div className={styles.scrollBottomAnchor}>
          <button
            type="button"
            className={styles.scrollToBottomButton}
            data-visible={showScrollToBottomBtn}
            onClick={(event) => {
              event.stopPropagation();
              handleScrollToBottom();
            }}
          >
            <SystemIcon name="chevron-down" size={24} className="text-white" />
          </button>
        </div>
      </main>

      <footer className={`footer ${styles.footer}`}>
        <section className={styles.textInputSection}>
          {suggestionsMenuNames.length > 0 && (
            <ul className={styles.autoCompleteList} aria-label="입력어 자동 완성 추천 목록">
              {suggestionsMenuNames.map((menuName) => (
                <li key={menuName}>
                  <button
                    type="button"
                    className={`${styles.autoCompleteItemButton} body-s-medium text-primary`}
                    onPointerDown={(event) => {
                      if (!event.isPrimary || event.button !== 0) return;

                      event.preventDefault();
                      handleAutoCompleteKeywords(menuName);
                    }}
                    onClick={(event) => {
                      if (event.detail === 0) {
                        handleAutoCompleteKeywords(menuName);
                      }
                    }}
                  >
                    {menuName}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setIsShowChatActions(!isShowChatActions)}
            className={styles.chatActionExpendButton}
            disabled={isChatBusy}
          >
            <SystemIcon
              name="plus-circle"
              size={24}
              data-isView={isShowChatActions}
              className={`text-tertiary ${styles.chatActionExpendButtonIcon}`}
            />
          </button>

          <textarea
            ref={textareaRef}
            value={inputMessage}
            rows={1}
            className={`body-s-regular ${styles.textInput}`}
            placeholder="메시지 입력"
            maxLength={500}
            onChange={handleChangeMessage}
            onFocus={() => {
              setIsShowChatActions(false);
            }}
            onInput={(e) => {
              const textarea = e.currentTarget;
              textarea.style.height = "auto";
              textarea.style.height = `${textarea.scrollHeight}px`;
            }}
            disabled={isChatBusy}
          />

          <button
            type="button"
            onPointerDown={(event) => {
              if (!event.isPrimary) return;
              handleSendMessage();
            }}
            onClick={(event) => {
              if (event.detail === 0) {
                handleSendMessage();
              }
            }}
            data-isView={inputMessage.trim() !== ""}
            className={styles.sendMessageButton}
            disabled={isChatBusy}
          >
            <div className={styles.sendMessageButtonIcon}>
              <SystemIcon name="arrow-up" size={16} />
            </div>
          </button>

          <div className={styles.mealRecordModeChip} data-isView={isTextMealRecordMode}>
            <span className="body-s-medium text-primary">식사 기록 모드</span>
            <button type="button" onClick={() => setIsTextMealRecordMode(false)}>
              <SystemIcon name="exit" size={16} className="text-primary" />
            </button>
          </div>
        </section>

        <section className={styles.chatActionsSection} data-isView={isShowChatActions}>
          <Menu.Root>
            <Menu.Trigger type="button" className={styles.chatActionButton}>
              <div className={styles.chatActionIcon}>
                <SystemIcon name="photo-library" size={24} />
              </div>
              <p className="body-xs-regular text-primary textCenter">사진</p>
            </Menu.Trigger>

            <Menu.Portal>
              <Menu.Positioner side="top" align="start" sideOffset={8}>
                <Menu.Popup className={`${styles.galleryMenu} body-s-medium text-primary`}>
                  <Menu.Item
                    onClick={() => {
                      void handlePickGalleryImage(MODE.FOOD);
                    }}
                    className={styles.galleryMenuItem}
                  >
                    음식 사진 업로드
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      void handlePickGalleryImage(MODE.NUTRITION);
                    }}
                    className={styles.galleryMenuItem}
                  >
                    영양성분표 사진 업로드
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>

          <button
            type="button"
            onClick={() => navigate(PATH.CHAT_CAMERA)}
            className={styles.chatActionButton}
          >
            <div className={styles.chatActionIcon}>
              <SystemIcon name="camera" size={24} />
            </div>
            <p className="body-xs-regular text-primary textCenter">카메라</p>
          </button>

          <button
            type="button"
            className={styles.chatActionButton}
            onClick={handleTextMealRecordAction}
            data-action={"text-meal-record-mode"}
          >
            <div className={styles.chatActionIcon}>
              <SystemIcon name="contract-edit" size={24} />
            </div>
            <p className="body-xs-regular text-primary textCenter">식사기록 모드</p>

            {isShowChatActions && <TextMealRecordCoachMark />}
          </button>

          <button
            type="button"
            className={styles.chatActionButton}
            onClick={handleGoToMealRecord}
            data-action={"direct-to-mealrecord"}
          >
            <div className={styles.chatActionIcon}>
              <SystemIcon name="search" size={24} />
            </div>
            <p className="body-xs-regular text-primary textCenter">직접 기록</p>
          </button>
        </section>
      </footer>
    </div>
  );
}

function ChatHistory({
  history,
  mealRecords,
  onScrollToBottomAction,
  responseWait,
}: {
  history: ChatHistoryItemResponseDto[];
  mealRecords: ReturnType<typeof useRecentDayMealsQuery>["data"];
  onScrollToBottomAction: (behavior?: ScrollBehavior) => void;
  responseWait: ResponseWait | null;
}) {
  const navigate = useNavigate();
  const sendingMessage = usePendingSendMessages();

  const [initChatIds] = useState(() => new Set(history.map((chat) => chat.id)));

  const pendingMessageKey = sendingMessage[0]?.key;
  const visibleChatList = sendingMessage[0]?.previousChats ?? history;
  const mealCards = mealRecords.flatMap((date, index) => {
    const dayMeals = mealRecords[index].meals;
    if (!dayMeals) return [];

    return ([0, 1, 2, 3, 4] as const).flatMap((time) => {
      const menus = dayMeals.menusByTime[time];
      if (menus.length === 0) return [];
      const mealRecordTime = parseDate(
        dayMeals.mealRecordTimestampsByTime[time]?.updatedAt ??
          dayMeals.mealRecordTimestampsByTime[time]?.createdAt ??
          "",
      );

      return [
        {
          messageType: "meal" as const,
          mealDate: date,
          time,
          menus,
          date: mealRecordTime,
        },
      ];
    });
  });
  const timeline = [...chatsByDate(visibleChatList), ...mealCards].sort(
    (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
  );
  const displayTimeline = [...timeline, ...sendingMessage];

  const scrollToBottom = useEffectEvent(onScrollToBottomAction);
  useLayoutEffect(() => {
    if (!pendingMessageKey) return;

    scrollToBottom();
  }, [pendingMessageKey]);

  if (displayTimeline.length === 0)
    return (
      <div className={`${styles.emptyHistorySection}`}>
        <img src="/icons/characters/question.png" width={200} alt="" aria-hidden="true" />
        <p className={`body-l-medium text-tertiary textCenter`}>
          식단 고민,
          <br />
          무엇이든 물어보세요
        </p>
      </div>
    );

  return displayTimeline.map((item, index) => {
    const itemKey =
      item.messageType === "chat"
        ? `chat:${item.chat.id}`
        : item.messageType === "meal"
          ? `meal:${item.mealDate.date}:${item.time}`
          : item.key;
    const prevItem = displayTimeline[index - 1];
    const isShowDateChip =
      item.date !== null &&
      (!prevItem?.date || formatDateKey(item.date) !== formatDateKey(prevItem.date));

    const messageType = item.messageType;
    const chat = messageType === "chat" ? item.chat : null;
    const userSendImage = chat?.image_url;
    const userSendText = item.messageType === "pending" ? item.inputText : (chat?.input_text ?? "");
    const messageTime = formatTimeText(item.date);
    const chatItem = chat?.response_payload;

    return (
      <section key={itemKey} className={styles.conversation}>
        {isShowDateChip && item.date && (
          <time className={styles.dateChip}>
            <span className="caption-m-medium text-white">{formatDateDividerText(item.date)}</span>
          </time>
        )}

        {(userSendImage || userSendText) && (
          <div className={styles.messageArea} data-owner="user">
            {userSendImage ? (
              <>
                <img
                  src={userSendImage}
                  onLoad={() => onScrollToBottomAction("auto")}
                  className={styles.sendImage}
                  alt="전송된 이미지"
                />
                <span
                  data-owner="user"
                  data-time={messageTime}
                  className={`caption-m-regular text-tertiary ${styles.messageTime}`}
                />
              </>
            ) : (
              <>
                <div className={styles.textBubble}>
                  <p className="body-m-regular text-primary">{userSendText}</p>
                  <span
                    data-owner="user"
                    data-time={messageTime}
                    className={`caption-m-regular text-tertiary ${styles.messageTime}`}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.messageArea} data-owner="ai">
          {messageType === "meal" && (
            <>
              <MealRecordCard date={item.mealDate.date} mealTime={item.time} menus={item.menus} />
              <span
                data-owner="ai"
                data-time={messageTime}
                className={`caption-m-regular text-tertiary ${styles.messageTime}`}
              />
            </>
          )}

          {messageType === "chat" && (
            <StreamBubble
              response={item.chat.response_payload}
              messageTime={messageTime}
              animate={!initChatIds.has(item.chat.id)}
              onReveal={onScrollToBottomAction}
              onComplete={responseWait?.chatId === item.chat.id ? responseWait.finish : undefined}
            >
              {chatItem?.chat_category === "feedback" &&
                chatItem.recognized_nutrition &&
                ("registered_menu" in chatItem && chatItem.registered_menu ? (
                  <SubActionCard
                    text={`${chatItem.registered_menu.menu_name} 메뉴 등록 완료!\n등록한 영양정보를 확인해 보세요.`}
                    action={() => {
                      const registeredMenu = chatItem.registered_menu;
                      if (!registeredMenu) return;

                      const { dateKey, mealTime } = getCurrentDateTime();

                      navigate(
                        getMenuSelectionMenuDetailPath({
                          menuId: registeredMenu.menu_id,
                          dateKey,
                          mealType: mealTime,
                          returnPath: PATH.CHAT,
                        }),
                      );
                    }}
                    actionText="등록한 메뉴 보기"
                  />
                ) : (
                  <SubActionCard
                    text={`영양성분을 인식했어요!\n어느 브랜드의 메뉴인가요?`}
                    action={() => {
                      navigate(PATH.CHAT_NUTRITION_REGISTER, {
                        state: chatItem.recognized_nutrition,
                      });
                    }}
                    actionText="메뉴 입력하기"
                  />
                ))}

              {chatItem?.chat_category === "inquiry" && (
                <SubActionCard
                  text={`더 자세한 도움이 필요하시면\n아래 버튼을 눌러주세요`}
                  action={() => navigate(PATH.SETTINGS_FEEDBACK)}
                  actionText="운영진에게 문의하기"
                />
              )}
            </StreamBubble>
          )}

          {messageType === "pending" && <AssistantPendingMessage />}
        </div>
      </section>
    );
  });
}

function chatsByDate(chatList: ChatHistoryItemResponseDto[]) {
  return chatList
    .map((chat) => {
      const date = parseDate(chat.createdAt);

      return { messageType: "chat" as const, chat, date };
    })
    .sort((a, b) => {
      if (!a.date && b.date) return -1;
      if (a.date && !b.date) return 1;
      if (!a.date || !b.date) return a.chat.id - b.chat.id;

      return a.date.getTime() - b.date.getTime() || a.chat.id - b.chat.id;
    });
}

function SubActionCard({
  text,
  action,
  actionText,
}: {
  text: string;
  action: () => void;
  actionText: string;
}) {
  return (
    <div className={styles.card} data-border="primary">
      <img src="/icons/characters/search.png" width={48} alt="" aria-hidden="true" />
      <p className={`body-l-regular text-primary ${styles.subCardLabel}`}>{text}</p>
      <Button variant="default" size="xs" onClick={action} fullWidth>
        {actionText}
      </Button>
    </div>
  );
}

function MealRecordCard({
  date,
  mealTime,
  menus,
}: {
  date: string;
  mealTime: number;
  menus: MenuWithQuantity[];
}) {
  const firstMenu = menus[0];
  const isSingleMenu = menus.length === 1;
  const time = mealTimeNumberToLabel(mealTime);
  const [isMenuExtended, setIsMenuExtended] = useState<boolean>(true);
  const [isMealDeleteOpen, setIsMealDeleteOpen] = useState<boolean>(false);
  const totalCalories = formatDisplayNumber(menus.reduce((sum, value) => sum + value.calories, 0));
  const navigate = useNavigate();

  const { mutateAsync: deleteMealRecordByTime, isPending: isDeleteMealPending } =
    useTodayMealRecordDeleteMutation();

  const handleToGoMealRecord = () => {
    navigate(getMealRecordPath(date, mealTime));
  };

  const handleDeleteMealRecord = () => {
    for (const menu of menus) {
      deleteMealRecordByTime({ date, time: mealTime as MealTime, menu_id: menu.id });
    }

    setIsMealDeleteOpen(false);
  };

  return (
    <div className={styles.card}>
      <p className="title-m-semi text-highlight">{time} 기록 완료!</p>

      <section className={styles.mealRecordMenuSection}>
        {isSingleMenu ? (
          <div className={styles.menuMeta}>
            <span className="body-s-regular text-primary">{firstMenu.name}</span>
            <span className="body-l-medium text-primary textNoWrap marginLeft">
              {totalCalories} kcal
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsMenuExtended(!isMenuExtended)}
              className={styles.menuMeta}
            >
              <>
                <span className="body-s-regular text-primary ellipsis">{firstMenu.name}</span>
                <span className={`body-s-regular text-primary textNoWrap ${styles.menuMetaGap}`}>
                  {"\u00a0"}외 {menus.length - 1}개
                </span>
              </>
              <span className="body-l-medium text-primary textNoWrap marginLeft">
                {totalCalories} kcal
                <SystemIcon
                  name="chevron-down"
                  data-isExtended={isMenuExtended}
                  size={12}
                  className={`${styles.menuExtendIcon}`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={handleToGoMealRecord}
              className={styles.extendMenuList}
              data-isExtended={isMenuExtended}
            >
              {menus.map((item) => {
                return (
                  <div key={item.id} className={styles.menuMeta}>
                    <span className={`body-s-regular text-secondary ${styles.menuMetaGap}`}>
                      {item.name}
                    </span>
                    <span className="body-s-medium text-primary textNoWrap marginLeft">
                      {formatDisplayNumber(item.calories)} kcal
                    </span>
                  </div>
                );
              })}
            </button>
          </>
        )}
      </section>

      <section className={styles.mealRecordActionSection}>
        <Button
          onClick={() => setIsMealDeleteOpen(true)}
          size="xs"
          fullWidth
          variant="outlined"
          border="secondary"
        >
          기록 취소
        </Button>
        <Button
          onClick={handleToGoMealRecord}
          size="xs"
          fullWidth
          variant="outlined"
          border="primary"
        >
          수정하기
        </Button>
      </section>

      <ConfirmModal
        open={isMealDeleteOpen}
        onOpenChange={setIsMealDeleteOpen}
        title="기록을 취소할까요?"
        description="방금 기록한 식사 내용이 삭제돼요"
        onConfirm={handleDeleteMealRecord}
        confirmText="취소할래요"
        cancelText="아니요"
        confirmDisabled={isDeleteMealPending}
      />
    </div>
  );
}

function StreamBubble({
  response,
  messageTime,
  animate,
  onReveal,
  onComplete,
  children,
}: {
  response: ChatRecommendResponseDto;
  messageTime: string;
  animate: boolean;
  onReveal: () => void;
  onComplete?: () => void;
  children?: ReactNode;
}) {
  const messages = textSplitByLines(response.intro_message ?? "");
  const cards = React.Children.toArray(children);

  const [visibleCount, setVisibleCount] = useState(1);

  const totalCount = messages.length + cards.length;
  const count = animate ? visibleCount : totalCount;
  const visibleCardCount = Math.max(0, count - messages.length);
  const isComplete = count >= totalCount;

  const lastBubbleRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const notifyReveal = useEffectEvent(onReveal);

  useEffect(() => {
    if (!animate || isComplete) return;

    const timerId = window.setTimeout(() => {
      setVisibleCount((current) => current + 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [animate, isComplete, visibleCount]);

  useLayoutEffect(() => {
    if (animate) notifyReveal();
  }, [animate, visibleCount]);

  useEffect(() => {
    if (!isComplete || !onComplete || completedRef.current) return;

    let cancelled = false;

    const animations = lastBubbleRef.current?.getAnimations() ?? [];

    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (cancelled || completedRef.current) return;

      completedRef.current = true;
      onComplete();
    });

    return () => {
      cancelled = true;
    };
  }, [isComplete, totalCount, onComplete]);

  return (
    <>
      {messages.slice(0, count).map((text, index) => (
        <div
          key={index}
          ref={index === totalCount - 1 ? lastBubbleRef : undefined}
          className={`${styles.textBubble} ${animate ? styles.bubbleEnter : ""}`}
        >
          <p className="body-m-regular text-primary">
            <AssistantMessageText text={text} />
          </p>

          <span
            data-owner="ai"
            data-time={messageTime}
            className={`caption-m-regular text-tertiary ${styles.messageTime}`}
          />
        </div>
      ))}

      {cards.slice(0, visibleCardCount).map((card, index) => (
        <div
          key={React.isValidElement(card) ? card.key : `card-${index}`}
          ref={messages.length + index === totalCount - 1 ? lastBubbleRef : undefined}
          className={animate ? styles.bubbleEnter : undefined}
        >
          {card}
        </div>
      ))}
    </>
  );
}

export function MealTimeSelectCard({
  initMealTime,
  onConfirm,
  onDismiss,
  disabled = false,
}: {
  initMealTime: MealType;
  onConfirm: (mealTime: MealType) => void;
  onDismiss: () => void;
  disabled?: boolean;
}) {
  const [mealTime, setMealTime] = useState<MealType>(initMealTime);

  return (
    <div className={`${styles.card} ${styles.mealTimeSelectCard}`}>
      <p className="title-m-medium text-primary">어떤 식사로 기록할까요?</p>

      <div className={styles.mealTimeChipList}>
        {MEAL_TIMES.map(({ type, label, icon }) => {
          return (
            <button
              type="button"
              key={label}
              className={styles.mealTimeChip}
              data-isSelected={mealTime === type}
              onClick={() => {
                setMealTime(type);
              }}
            >
              <SystemIcon name={icon} size={18} className="text-highlight" />
              <span className="body-xs-regular text-primary">{label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.mealTimeActionsSection}>
        <Button size="xs" fullWidth variant="outlined" border="secondary" onClick={onDismiss}>
          기록 안할래요
        </Button>
        <Button
          size="xs"
          fullWidth
          variant="outlined"
          border="primary"
          onClick={() => onConfirm(mealTime)}
          disabled={disabled}
        >
          확인
        </Button>
      </div>
    </div>
  );
}

function getTypingKeyword(text: string) {
  const parts = text
    .trimEnd()
    .split(/[\s,，.、/]+/)
    .filter(Boolean);

  return parts.at(-1) ?? "";
}

function TextMealRecordCoachMark() {
  const [shouldShow] = useState(() => {
    try {
      return window.localStorage.getItem(CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY) !== "seen";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!shouldShow) return;

    try {
      window.localStorage.setItem(CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY, "seen");
    } catch {
      // 저장소를 사용할 수 없어도 화면 동작은 유지합니다.
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <span className={`${styles.mealRecordModeBubble} caption-m-medium`} aria-hidden="true">
      채팅에 식사 내용을 보내서 간단하게 기록해요
    </span>
  );
}
