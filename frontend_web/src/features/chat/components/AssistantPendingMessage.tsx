import { useEffect, useState } from "react";

import styles from "@/features/chat/styles/AssistantPendingMessage.module.css";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";

const LONG_WAIT_DELAY_MS = 5000;
const LONG_WAIT_TRANSITION_MS = 320;
const STATUS_ROTATE_INTERVAL_MS = 5000;

const PENDING_STATUS_MESSAGE_COUNT = 3;

export function AssistantPendingMessage() {
  const { data: profile } = useGetProfileQuery();
  const [isLongWaitVisible, setIsLongWaitVisible] = useState(false);
  const [isTypingVisible, setIsTypingVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const displayNickname = profile?.nickname.trim() || "사용자";

  useEffect(() => {
    let transitionTimerId: number | undefined;

    const delayTimerId = window.setTimeout(() => {
      setIsLongWaitVisible(true);
      transitionTimerId = window.setTimeout(() => {
        setIsTypingVisible(false);
      }, LONG_WAIT_TRANSITION_MS);
    }, LONG_WAIT_DELAY_MS);

    return () => {
      window.clearTimeout(delayTimerId);

      if (transitionTimerId !== undefined) {
        window.clearTimeout(transitionTimerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLongWaitVisible) {
      return;
    }

    const rotateTimerId = window.setInterval(() => {
      setMessageIndex((currentIndex) => (currentIndex + 1) % PENDING_STATUS_MESSAGE_COUNT);
    }, STATUS_ROTATE_INTERVAL_MS);

    return () => {
      window.clearInterval(rotateTimerId);
    };
  }, [isLongWaitVisible]);

  return (
    <div className={styles.assistantMessageGroup}>
      <div
        className={`${styles.pendingStatus} ${isLongWaitVisible ? styles.pendingStatusLongWait : ""}`}
      >
        {isTypingVisible ? (
          <div className={styles.typingLayer} aria-hidden={isLongWaitVisible}>
            <div className={styles.typingBubble} aria-label="답변 생성 중">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        ) : null}

        {isLongWaitVisible ? (
          <div className={styles.longWaitStatus} role="status" aria-live="polite">
            <div className={styles.longWaitMarker} aria-hidden="true">
              <span className={styles.longWaitDot} />
              <span className={styles.longWaitDot} />
              <span className={styles.longWaitDot} />
              <span className={styles.longWaitDot} />
            </div>
            <p key={messageIndex} className={`${styles.longWaitText} typo-body3`}>
              {getPendingStatusMessage(messageIndex, displayNickname)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getPendingStatusMessage(index: number, nickname: string) {
  switch (index) {
    case 1:
      return `${nickname}님을 위한\n최적의 메뉴를 찾는 중이에요`;
    case 2:
      return "답변을 준비하고 있어요";
    default:
      return "영양성분을 꼼꼼히 분석하고 있어요";
  }
}
