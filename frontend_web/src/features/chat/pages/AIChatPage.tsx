import React, { useEffect, useEffectEvent, useRef, useState } from "react";

import { AssistantMessageText } from "@/features/chat/components/AssistantMessageText";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/AIChatPage.module.css";
import { textSplitByLines } from "@/features/chat/utils/textdivider.util";
import { PATH } from "@/router/path";
import type {
  ChatHistoryItemResponseDto,
  FeedbackItemDto,
} from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import ArcProgress from "@/shared/commons/progress/ArcProgress";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import {
  formatDateDividerText,
  formatDateKey,
  formatTimeText,
  parseDate,
} from "@/shared/utils/dateFormat";
import { convertWeightToServingCount, getServingUnitLabel } from "@/shared/utils/servingUnit";

export default function AIChatPage() {
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

          <button type="button" className={styles.chatActionButton}>
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

  const { data: chatHistory, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const chatList = chatHistory?.chat_list ?? [];
  const conversation = chatsByDate(chatList);

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
  }, [isHistoryPending]);

  const onInitLoad = useEffectEvent(() => {
    if (conversation.length > 0) handleScrollToBottom("auto");
  });
  useEffect(() => {
    if (!isHistoryPending) {
      onInitLoad();
    }
  }, [isHistoryPending]);

  if (isHistoryPending) return <>로딩</>;
  if (chatList.length === 0)
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
        const userSendImage = item.chat.image_url;
        const userSendText = item.chat.input_text.trim();
        const messageTime = item.chat.createdAt ? formatTimeText(item.chat.createdAt) : null;
        const receiveMessages = textSplitByLines(item.chat.response_payload.intro_message ?? "");
        const category = item.chat.response_payload.chat_category;

        return (
          <section key={item.chat.id} className={styles.conversation}>
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
                      // onLoad={handleScrollToBottom}
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

              {category === "feedback" && (
                <FeedbackCard feedbackItem={item.chat.response_payload.feedback} />
              )}

              {category === "feedback" && item.chat.response_payload.recognized_nutrition && (
                <SubActionCard
                  text={`영양성분을 인식했어요!\n어느 브랜드의 메뉴인가요?`}
                  action={() => {}}
                  actionText="메뉴 입력하기"
                />
              )}

              {category === "inquiry" && (
                <SubActionCard
                  text={`더 자세한 도움이 필요하시면\n아래 버튼을 눌러주세요`}
                  action={() => navigate(PATH.SETTINGS_FEEDBACK)}
                  actionText="운영진에게 문의하기"
                />
              )}
            </div>
          </section>
        );
      })}

      <div ref={scrollEndRef} />
      {showScrollToBottomBtn && (
        <button
          type="button"
          className={styles.scrollToBottomButton}
          onClick={() => handleScrollToBottom()}
        >
          <SystemIcon name="chevron-down" size={24} className="text-white" />
        </button>
      )}
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

function FeedbackCard({ feedbackItem }: { feedbackItem: FeedbackItemDto | undefined }) {
  const [isMenuExtended, setIsMenuExtended] = useState<boolean>(false);

  if (!feedbackItem) return null;
  const isSingleMenu = feedbackItem.menus.length === 1;
  const singleMenu = feedbackItem.menus[0];
  const singleMenuMeta = convertWeightToServingCount({
    baseWeight: singleMenu.weight,
    consumedWeight: singleMenu.estimated_quantity ?? singleMenu.weight,
  });

  return (
    <div className={styles.card}>
      <section className={styles.feedbackScoreSection}>
        <ArcProgress
          value={feedbackItem.score}
          gradient={{ startColor: "#ff989a", endColor: "var(--coral-400)" }}
          ariaLabel="메뉴 추천도"
        >
          <div className={styles.scoreLabel}>
            <p className="title-l-semi text-primary">
              {feedbackItem.score}
              <span className={styles.fwRegular}>점</span>
            </p>
            <p className="body-s-medium text-tertiary">메뉴 추천도</p>
          </div>
        </ArcProgress>
      </section>

      {isSingleMenu ? (
        <section className={styles.feedbackMenuSection}>
          <p className="title-m-medium text-primary">{singleMenu.menu_name}</p>
          <div className={styles.feedbackMenuMeta}>
            <span className="body-s-regular text-primary">
              {singleMenuMeta}
              {getServingUnitLabel(singleMenu.unit_quantity)} ({singleMenu.estimated_quantity}
              {singleMenu.estimated_quantity_unit})
            </span>
            <span className="body-l-medium text-primary marginLeft">
              {singleMenu.estimated_calories} kcal
            </span>
          </div>
        </section>
      ) : (
        <section className={styles.feedbackMenuSection}>
          <p className="title-m-medium text-primary">
            {feedbackItem.menus[0].menu_name}
            <span> 외 {feedbackItem.menus.length - 1}개</span>
          </p>

          <button
            type="button"
            onClick={() => setIsMenuExtended(!isMenuExtended)}
            className={styles.feedbackMenuMeta}
          >
            <span className="body-s-regular text-primary">총 칼로리</span>
            <span className="body-l-medium text-primary marginLeft">
              {feedbackItem.total_calories} kcal
              <SystemIcon
                name="chevron-down"
                data-isExtended={isMenuExtended}
                size={12}
                className={`${styles.menuExtendIcon}`}
              />
            </span>
          </button>

          <div className={styles.feedbackMenuList} data-isExtended={isMenuExtended}>
            {feedbackItem.menus.map((menu, index) => {
              return (
                <div key={index} className={styles.feedbackMenuMeta}>
                  <span className="body-s-regular text-primary">{menu.menu_name}</span>
                  <span className="body-s-medium text-primary marginLeft">
                    {menu.estimated_calories} kcal
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.feedbackActionSection}>
        <Button size="xs" fullWidth variant="outlined" border="primary">
          식사 기록하기
        </Button>
        <Button size="xs" fullWidth variant="outlined" border="secondary">
          영양성분 보기
        </Button>
      </section>
    </div>
  );
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
