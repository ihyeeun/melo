import React, { useEffect, useEffectEvent, useRef, useState } from "react";

import { AssistantMessageText } from "@/features/chat/components/AssistantMessageText";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/AIChatPage.module.css";
import { getCurrentDateTime } from "@/features/chat/utils/date.util";
import { textSplitByLines } from "@/features/chat/utils/textdivider.util";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import type { ChatHistoryItemResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import {
  formatDateDividerText,
  formatDateKey,
  formatTimeText,
  getTodayFormatDateKey,
  parseDate,
} from "@/shared/utils/dateFormat";
import { mealTimeNumberToLabel } from "@/shared/utils/timeformat";

export default function AIChatPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isShowChatActions, setIsShowChatActions] = useState<boolean>(true);
  const [isTextMealRecordMode, setIsTextMealRecordMode] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");

  const handleTextMealRecordAction = () => {
    const nextMode = !isTextMealRecordMode;
    setIsTextMealRecordMode(nextMode);

    if (nextMode) {
      setIsShowChatActions(false);
      textareaRef.current?.focus();
    }
  };
  const handleChangeMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };
  const handleGoToMealRecord = () => {
    const { dateKey, mealTime } = getCurrentDateTime();
    navigate(getMealRecordPath(dateKey, mealTime));
  };

  return (
    <div className={`page ${styles.root}`}>
      <header className={styles.header}>
        <PageHeader onBack={() => navigateBack()} />
      </header>

      <main className="main" onClick={() => setIsShowChatActions(false)}>
        <ChatHistory />
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
          />

          <button
            type="button"
            data-isView={inputMessage.trim() !== ""}
            className={styles.sendMessageButton}
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
          <button type="button" className={styles.chatActionButton}>
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

function ChatHistory() {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState<boolean>(false);
  const navigate = useNavigate();
  const mealDate = getTodayFormatDateKey();

  const { data: chatHistory, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { data: dayMeals, isPending: isMealsPending } = useDayMealsQuery(mealDate);

  const timelinePending = isHistoryPending || isMealsPending;
  const chatList = chatHistory?.chat_list ?? [];
  const mealCards = ([0, 1, 2, 3, 4] as const).flatMap((time) => {
    const menus = dayMeals?.menusByTime[time] ?? [];
    if (menus.length === 0) return [];
    return [
      {
        time,
        menus,
        date: parseDate(dayMeals?.mealRecordTimestampsByTime[time]?.updatedAt ?? ""),
      },
    ];
  });
  const conversation = [...chatsByDate(chatList), ...mealCards].sort(
    (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
  );

  const handleScrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollEndRef.current?.scrollIntoView({ behavior });
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
  }, [timelinePending]);

  const onInitLoad = useEffectEvent(() => {
    if (conversation.length > 0) handleScrollToBottom("auto");
  });
  useEffect(() => {
    if (!timelinePending) {
      onInitLoad();
    }
  }, [timelinePending]);

  if (timelinePending) return <>로딩</>;
  if (conversation.length === 0)
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

  return (
    <div className={`${styles.content}`}>
      {conversation.map((item, index) => {
        const prevItem = conversation[index - 1];
        const isShowDateChip =
          item.date !== null &&
          (!prevItem?.date || formatDateKey(item.date) !== formatDateKey(prevItem.date));

        const chat = "chat" in item ? item.chat : null;
        const userSendImage = chat?.image_url;
        const userSendText = chat?.input_text.trim() ?? "";
        const messageTime = chat?.createdAt ? formatTimeText(chat.createdAt) : null;
        const receiveMessages = textSplitByLines(chat?.response_payload.intro_message ?? "");

        return (
          <section
            key={"menus" in item ? `meal:${item.time}` : `chat:${item.chat.id}`}
            className={styles.conversation}
          >
            {isShowDateChip && item.date && (
              <time className={styles.dateChip}>
                <span className="caption-m-medium text-white">
                  {formatDateDividerText(item.date)}
                </span>
              </time>
            )}

            {(userSendImage || userSendText) && (
              <div className={styles.messageArea} data-owner="user">
                {userSendImage ? (
                  <>
                    <img
                      src={userSendImage}
                      onLoad={() => handleScrollToBottom()}
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
              {"menus" in item ? (
                <MealRecordCard date={mealDate} mealTime={item.time} menus={item.menus} />
              ) : (
                <>
                  {receiveMessages.map((text, index) => (
                    <div key={index} className={styles.textBubble}>
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

                  {item.chat.response_payload.chat_category === "feedback" &&
                    item.chat.response_payload.recognized_nutrition && (
                      <SubActionCard
                        text={`영양성분을 인식했어요!\n어느 브랜드의 메뉴인가요?`}
                        action={() => {}}
                        actionText="메뉴 입력하기"
                      />
                    )}

                  {item.chat.response_payload.chat_category === "inquiry" && (
                    <SubActionCard
                      text={`더 자세한 도움이 필요하시면\n아래 버튼을 눌러주세요`}
                      action={() => navigate(PATH.SETTINGS_FEEDBACK)}
                      actionText="운영진에게 문의하기"
                    />
                  )}
                </>
              )}
            </div>
          </section>
        );
      })}

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
    </div>
  );
}

function chatsByDate(chatList: ChatHistoryItemResponseDto[]) {
  return chatList
    .map((chat) => {
      const date = parseDate(chat.createdAt);

      return { chat, date };
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
  const totalCalories = menus.reduce((sum, value) => sum + value.calories, 0).toLocaleString();
  const navigate = useNavigate();

  const handleToGoMealRecord = () => {
    navigate(getMealRecordPath(date, mealTime));
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
                    <span className="body-s-regular text-secondary">{item.name}</span>
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
        <Button onClick={() => {}} size="xs" fullWidth variant="outlined" border="secondary">
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
    </div>
  );
}
