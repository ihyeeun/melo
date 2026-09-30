import React, { useRef, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/AIChatPage.module.css";
import type { ChatHistoryItemResponseDto } from "@/shared/api/types/api.response.dto";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import { formatDateDividerText, formatDateKey, parseDate } from "@/shared/utils/dateFormat";

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

          <SystemIcon name="chevron-up" size={24} />

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
  const { data: chatHistory, isPending: isHistoryPending } = useGetChatHistoryQuery();

  if (isHistoryPending) return <>로딩</>;

  const chatList = chatHistory?.chat_list ?? [];

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

  const conversation = chatsByDate(chatList);

  return (
    <div className={`${styles.content}`}>
      {conversation.map((item, index) => {
        const prevItem = conversation[index - 1];
        const isShowDateChip =
          item.date !== null &&
          (!prevItem?.date || formatDateKey(item.date) !== formatDateKey(prevItem.date));
        const userSendImage = item.chat.image_url;
        const userSendText = item.chat.input_text.trim();

        return (
          <section key={item.chat.id} className={styles.conversation}>
            {isShowDateChip && item.date && (
              <time className={styles.dateChip}>
                <span className="caption-medium">{formatDateDividerText(item.date)}</span>
              </time>
            )}

            {(userSendImage || userSendText) && (
              <div className={styles.userSendArea}>
                {userSendImage ? (
                  <img src={userSendImage} className={styles.sendImage} alt="전송된 이미지" />
                ) : (
                  <div className={styles.textBubble}>
                    <p className="body-m-regular text-primary">{userSendText}</p>
                  </div>
                )}
              </div>
            )}

            {/* TODO : message time 추가 */}
            {/* TODO : ai message 추가 */}
          </section>
        );
      })}
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
