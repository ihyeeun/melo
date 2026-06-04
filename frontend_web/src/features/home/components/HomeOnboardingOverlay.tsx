import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "@/features/home/styles/HomeOnboardingOverlay.module.css";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type OnboardingTarget = "chat" | "menu-board-camera";

type HomeOnboardingOverlayProps = {
  onFinish: () => void;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
};

type OnboardingStep = {
  description: string;
  title: string;
  target: OnboardingTarget;
};

type SpotlightMetrics = {
  height: number;
  targetCenterX: number;
  targetRight: number;
  targetTop: number;
  viewportHeight: number;
  viewportWidth: number;
  width: number;
  x: number;
  y: number;
};

type CommittedSpotlightMetrics = SpotlightMetrics & {
  stepIndex: number;
  target: OnboardingTarget;
};

const SPOTLIGHT_PADDING = 2;
const AFTER_READY_FRAME_DELAY = 2;
const METRIC_CHANGE_TOLERANCE = 0.5;

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function findTargetElement(target: OnboardingTarget) {
  return document.querySelector<HTMLElement>(`[data-home-onboarding-target="${target}"]`);
}

function readSpotlightMetrics(target: OnboardingTarget): SpotlightMetrics | null {
  const targetElement = findTargetElement(target);

  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    x: Math.max(rect.left - SPOTLIGHT_PADDING, 0),
    y: Math.max(rect.top - SPOTLIGHT_PADDING, 0),
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    targetCenterX: rect.left + rect.width / 2,
    targetRight: rect.right,
    targetTop: rect.top,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function hasMetricSettled(previous: SpotlightMetrics | null, next: SpotlightMetrics | null) {
  if (!previous || !next) return false;

  return (
    Math.abs(previous.x - next.x) < METRIC_CHANGE_TOLERANCE &&
    Math.abs(previous.y - next.y) < METRIC_CHANGE_TOLERANCE &&
    Math.abs(previous.width - next.width) < METRIC_CHANGE_TOLERANCE &&
    Math.abs(previous.height - next.height) < METRIC_CHANGE_TOLERANCE &&
    Math.abs(previous.viewportWidth - next.viewportWidth) < METRIC_CHANGE_TOLERANCE &&
    Math.abs(previous.viewportHeight - next.viewportHeight) < METRIC_CHANGE_TOLERANCE
  );
}

export default function HomeOnboardingOverlay({
  onFinish,
  showChatCard,
  showMenuBoardCameraCard,
}: HomeOnboardingOverlayProps) {
  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    const steps: OnboardingStep[] = [];

    if (showMenuBoardCameraCard) {
      steps.push({
        target: "menu-board-camera",
        title: "메뉴판이나 음식을 찍어보세요!",
        description: "메뉴 추천과 피드백을 해드려요",
      });
    }

    if (showChatCard) {
      steps.push({
        target: "chat",
        title: "식단 고민, 무엇이든 물어보세요",
        description: "",
      });
    }

    return steps;
  }, [showChatCard, showMenuBoardCameraCard]);

  const [stepIndex, setStepIndex] = useState(0);
  const [committedMetrics, setCommittedMetrics] = useState<CommittedSpotlightMetrics | null>(null);
  const [bubbleMeasure, setBubbleMeasure] = useState({ stepIndex: 0, width: 0 });
  const bubbleRef = useRef<HTMLElement | null>(null);
  const currentStep = onboardingSteps[stepIndex] ?? null;
  const metrics =
    currentStep &&
    committedMetrics?.stepIndex === stepIndex &&
    committedMetrics.target === currentStep.target
      ? committedMetrics
      : null;
  const bubbleWidth = bubbleMeasure.stepIndex === stepIndex ? bubbleMeasure.width : 0;

  useEffect(() => {
    if (!currentStep) return;

    let animationFrameId = 0;

    const updateMetrics = () => {
      const nextMetrics = readSpotlightMetrics(currentStep.target);

      if (!nextMetrics) return;

      setCommittedMetrics((previousMetrics) =>
        previousMetrics?.stepIndex === stepIndex &&
        previousMetrics.target === currentStep.target &&
        hasMetricSettled(previousMetrics, nextMetrics)
          ? previousMetrics
          : { ...nextMetrics, stepIndex, target: currentStep.target },
      );
    };

    const scheduleMeasureAfterReadyPaint = (remainingFrames = AFTER_READY_FRAME_DELAY) => {
      animationFrameId = requestAnimationFrame(() => {
        if (remainingFrames > 1) {
          scheduleMeasureAfterReadyPaint(remainingFrames - 1);
          return;
        }

        updateMetrics();
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      scheduleMeasureAfterReadyPaint();
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [currentStep, stepIndex]);

  useEffect(() => {
    if (!currentStep || !metrics) return;
    const bubbleElement = bubbleRef.current;
    if (!bubbleElement) return;

    const updateBubbleWidth = () => {
      const nextWidth = bubbleElement.getBoundingClientRect().width;
      if (nextWidth <= 0) return;

      setBubbleMeasure((previous) => {
        if (previous.stepIndex === stepIndex && Math.abs(previous.width - nextWidth) < 0.5) {
          return previous;
        }

        return { stepIndex, width: nextWidth };
      });
    };

    updateBubbleWidth();

    let animationFrameId = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateBubbleWidth);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);

    resizeObserver?.observe(bubbleElement);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [currentStep, metrics, stepIndex]);

  if (!currentStep || !metrics) return null;

  const isLastStep = stepIndex === onboardingSteps.length - 1;
  const bubbleMaxWidth = Math.min(280, metrics.viewportWidth - 24);
  const prefersRightAlignedBubble = currentStep.target === "chat";
  const bubbleRight = clamp(
    metrics.viewportWidth - metrics.targetRight - 6,
    12,
    metrics.viewportWidth - 12,
  );
  const bubbleLeft = clamp(
    metrics.targetCenterX - bubbleMaxWidth / 2,
    12,
    metrics.viewportWidth - bubbleMaxWidth - 12,
  );
  const bubbleBottom = Math.max(metrics.viewportHeight - metrics.targetTop + 12, 20);
  const measuredBubbleWidth = bubbleWidth > 0 ? bubbleWidth : bubbleMaxWidth;
  const tailLeft = prefersRightAlignedBubble
    ? "calc(100% - 60px)"
    : `${clamp(metrics.targetCenterX - bubbleLeft, 20, measuredBubbleWidth - 20)}px`;
  const bubbleStyle: CSSProperties & Record<"--tail-left", string> = {
    bottom: bubbleBottom,
    maxWidth: bubbleMaxWidth,
    "--tail-left": tailLeft,
    ...(prefersRightAlignedBubble ? { right: bubbleRight } : { left: bubbleLeft }),
  };

  const handleAdvanceStepOrFinish = () => {
    if (isLastStep) {
      onFinish();
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, onboardingSteps.length - 1));
  };

  return (
    <div className={styles.overlayRoot} aria-hidden="true" onClick={handleAdvanceStepOrFinish}>
      <button
        type="button"
        className={styles.closeButton}
        onClick={(event) => {
          event.stopPropagation();
          onFinish();
        }}
        aria-label="온보딩 닫기"
      >
        <SystemIcon name="close" size={24} />
      </button>

      <div
        className={styles.spotlight}
        style={{
          top: metrics.y,
          left: metrics.x,
          width: metrics.width,
          height: metrics.height,
        }}
      />

      <section ref={bubbleRef} className={styles.bubble} style={bubbleStyle}>
        <p className={`${styles.title} typo-title4`}>{currentStep.title}</p>
        {currentStep.description ? (
          <p className={`${styles.description} typo-body3`}>{currentStep.description}</p>
        ) : null}

        <div className={styles.bubbleFooter}>
          {!isLastStep ? (
            <Button
              className={`${styles.nextButton}`}
              onClick={(event) => {
                event.stopPropagation();
                handleAdvanceStepOrFinish();
              }}
              variant="text"
              color="normal"
            >
              다음
            </Button>
          ) : (
            <span />
          )}
          <span className={`${styles.stepCount} typo-caption4`}>
            {stepIndex + 1}/{onboardingSteps.length}
          </span>
        </div>
      </section>
    </div>
  );
}
