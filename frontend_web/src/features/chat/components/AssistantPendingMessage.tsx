import { useEffect, useState } from "react";

import styles from "@/features/chat/styles/AssistantPendingMessage.module.css";

const LONG_WAIT_DELAY_MS = 5000;
const LONG_WAIT_TRANSITION_MS = 320;
const STATUS_ROTATE_INTERVAL_MS = 5000;

const PENDING_STATUS_MESSAGE_COUNT = 4;

export function AssistantPendingMessage() {
  const [isLongWaitVisible, setIsLongWaitVisible] = useState(false);
  const [isTypingVisible, setIsTypingVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

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
            {getPendingStatusMessage(messageIndex)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function getPendingStatusMessage(index: number) {
  switch (index) {
    case 1:
      return `필요한 내용을 정리하고 있어요`;
    case 2:
      return "답변을 준비 중이에요";
    case 3:
      return "더 정확한 답변을 위해 확인하고 있어요";
    default:
      return "꼼꼼하게 살펴보고 있어요";
  }
}
