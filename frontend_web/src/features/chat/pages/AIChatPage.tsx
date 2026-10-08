import React, {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { AssistantMessageText } from "@/features/chat/components/AssistantMessageText";
import { AssistantPendingMessage } from "@/features/chat/components/AssistantPendingMessage";
import {
  usePendingSendMessages,
  useSendMessageMutation,
} from "@/features/chat/hooks/mutations/useSendMessageMutation";
import {
  useGetChatHistoryQuery,
  useRecentDayMealsQuery,
} from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/AIChatPage.module.css";
import { getCurrentDateTime } from "@/features/chat/utils/date.util";
import { textSplitByLines } from "@/features/chat/utils/textdivider.util";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import {
  useTodayMealRecordDeleteMutation,
  useTodayMealRecordRegisterMutation,
} from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import {
  formatMenuDraftKey,
  useMenuDraftBuildRegisterRequest,
  useMenuDraftUpsert,
  useSyncMenuDraftWithDayMeals,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMenuSelectionMenuDetailPath } from "@/features/menu-selection/utils/menuSelectionRoutes";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import type { MealType } from "@/shared/api/types/api.dto";
import type { MealTime } from "@/shared/api/types/api.request.dto";
import type {
  ChatFeedbackMenuResponseDto,
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
import { mealTimeNumberToLabel } from "@/shared/utils/timeformat";

export default function AIChatPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const [isShowChatActions, setIsShowChatActions] = useState<boolean>(true);
  const [isTextMealRecordMode, setIsTextMealRecordMode] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState<boolean>(false);

  const historyQuery = useGetChatHistoryQuery();
  const mealsQuery = useRecentDayMealsQuery();
  const { mutate: sendMessage, isPending: isSendMessagePending } = useSendMessageMutation();

  const isTimelinePending = historyQuery.isPending || mealsQuery.isPending;

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
    setInputMessage(e.target.value);
  };
  const handleGoToMealRecord = () => {
    const { dateKey, mealTime } = getCurrentDateTime();
    navigate(getMealRecordPath(dateKey, mealTime));
  };
  const handleSendMessage = () => {
    const formattedMessage = inputMessage.trim();
    if (!formattedMessage) return;

    sendMessage(
      { input: formattedMessage },
      {
        onSuccess: () => {
          setInputMessage("");
        },
        onError: () => {
          toast.error("연결이 일시적으로 불안정해요. 다시 시도해주세요.");
        },
      },
    );
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
    if (!isTimelinePending) {
      handleScrollToBottom("auto");
    }
  }, [isTimelinePending]);

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
          />
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
          <button
            type="button"
            onClick={() => setIsShowChatActions(!isShowChatActions)}
            className={styles.chatActionExpendButton}
            data-isView={isShowChatActions}
          >
            <SystemIcon name="plus-circle" size={24} className={`text-tertiary`} />
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
            disabled={isSendMessagePending}
          />

          <button
            type="button"
            onClick={handleSendMessage}
            data-isView={inputMessage.trim() !== ""}
            className={styles.sendMessageButton}
            disabled={isSendMessagePending}
          >
            <SystemIcon name="arrow-up" size={16} />
          </button>

          <div className={styles.mealRecordModeChip} data-isView={isTextMealRecordMode}>
            <span className="body-s-medium text-primary">식사 기록 모드</span>
            <button type="button" onClick={() => setIsTextMealRecordMode(false)}>
              <SystemIcon name="exit" size={16} className="text-primary" />
            </button>
          </div>
        </section>

        <section className={styles.chatActionsSection} data-isView={isShowChatActions}>
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

            <span className={`${styles.mealRecordModeBubble} caption-m-medium`} aria-hidden="true">
              채팅에 식사 내용을 보내서 간단하게 기록해요
            </span>
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
}: {
  history: ChatHistoryItemResponseDto[];
  mealRecords: ReturnType<typeof useRecentDayMealsQuery>["data"];
  onScrollToBottomAction: (behavior?: ScrollBehavior) => void;
}) {
  const navigate = useNavigate();
  const { state: chatNavigationState } = useLocation<{
    streamChatId?: number;
  }>();
  const sendingMessage = usePendingSendMessages();

  const [initChatIds] = useState(() => new Set(history.map((chat) => chat.id)));
  const [closedMealTimeChatId, SetClosedMealTimeChatId] = useState<number | null>(null);

  const pendingMessageKey = sendingMessage[0]?.key;
  const prevChatIds = sendingMessage[0]?.previousChatIds;
  const visibleChatList = prevChatIds
    ? history.filter((chat) => prevChatIds.includes(chat.id))
    : history;
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
  const latestChatId = chatsByDate(history).at(-1)?.chat.id;
  const isLatestChatNew =
    latestChatId !== undefined &&
    (!initChatIds.has(latestChatId) || latestChatId === chatNavigationState?.streamChatId);
  const newChatId = isLatestChatNew ? latestChatId : null;

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

    const isNewResponse = chat !== null && chat.id === newChatId;
    const isMealTimeCardClosed = chat !== null && chat.id === closedMealTimeChatId;

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
              animate={
                !initChatIds.has(item.chat.id) || item.chat.id === chatNavigationState?.streamChatId
              }
              onReveal={onScrollToBottomAction}
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

              {isNewResponse &&
                !isMealTimeCardClosed &&
                chatItem?.chat_category === "feedback" &&
                chatItem.feedback?.menus && (
                  <MealTimeSelectCard
                    key="meal-time-selected"
                    onDismiss={() => {
                      SetClosedMealTimeChatId(item.chat.id);
                    }}
                    menus={chatItem.feedback.menus}
                    imageUrl={chatItem.image_url}
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
  const totalCalories = menus.reduce((sum, value) => sum + value.calories, 0).toLocaleString();
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
                  외 {menus.length - 1}개
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
                  <div className={styles.menuMeta}>
                    <span className={`body-s-regular text-secondary ${styles.menuMetaGap}`}>
                      {item.name}
                    </span>
                    <span className="body-s-medium text-primary textNoWrap marginLeft">
                      {item.calories} kcal
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
  children,
}: {
  response: ChatRecommendResponseDto;
  messageTime: string;
  animate: boolean;
  onReveal: () => void;
  children?: ReactNode;
}) {
  const messages = textSplitByLines(response.intro_message ?? "");
  const cards = React.Children.toArray(children);

  const [visibleCount, setVisibleCount] = useState(1);

  const totalCount = messages.length + cards.length;
  const count = animate ? visibleCount : totalCount;
  const visibleCardCount = Math.max(0, count - messages.length);
  const isComplete = count >= totalCount;

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

  return (
    <>
      {messages.slice(0, count).map((text, index) => (
        <div key={index} className={`${styles.textBubble} ${animate ? styles.bubbleEnter : ""}`}>
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
          className={animate ? styles.bubbleEnter : undefined}
        >
          {card}
        </div>
      ))}
    </>
  );
}

function MealTimeSelectCard({
  onDismiss,
  menus,
  imageUrl,
}: {
  onDismiss: () => void;
  menus: ChatFeedbackMenuResponseDto[];
  imageUrl?: string | null;
}) {
  const { dateKey, mealTime: currentTime } = getCurrentDateTime();
  const [mealTime, setMealTime] = useState<MealType>(currentTime);

  const { data: dayMeals } = useDayMealsQuery(dateKey);
  const { mutate: registerMeal, isPending: isMealSaving } = useTodayMealRecordRegisterMutation({
    onSuccess: onDismiss,
    onError: () => {
      // 식사 기록을 저장하지 못했어요
    },
  });

  useSyncMenuDraftWithDayMeals({
    dateKey,
    mealType: mealTime,
    dayMeals,
  });
  const upsertMenu = useMenuDraftUpsert();
  const buildRegisterRequest = useMenuDraftBuildRegisterRequest();

  const handleMealRecord = () => {
    if (isMealSaving || !dayMeals || menus.length === 0) return;

    const draftKey = formatMenuDraftKey(dateKey, mealTime);

    menus.forEach((menu) => {
      upsertMenu({
        key: draftKey,
        id: menu.menu_id,
        quantity: menu.estimated_quantity ?? menu.weight,
        mode: "weight",
      });
    });

    const request = buildRegisterRequest({
      dateKey,
      mealType: mealTime,
      fallbackImage: imageUrl,
    });

    registerMeal(request);
  };

  return (
    <div className={`${styles.card} ${styles.mealTimeSelectCard}`}>
      <p className="title-m-medium text-primary">어떤 식사로 기록할까요?</p>

      <div className={styles.mealTimeChipList}>
        {MEAL_TIMES.map(({ type, label, icon }) => {
          return (
            <button
              type="button"
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
        <Button size="xs" fullWidth variant="outlined" border="primary" onClick={handleMealRecord}>
          확인
        </Button>
      </div>
    </div>
  );
}
