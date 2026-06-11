import type { HomeOnboardingStep } from "@/features/home/constants/homeOnboarding";
import styles from "@/features/home/styles/HomeOnboardingOverlay.module.css";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type HomeOnboardingOverlayProps = {
  onAdvance: () => void;
};

type HomeOnboardingBubbleProps = {
  onAdvance: () => void;
  step: HomeOnboardingStep;
  stepIndex: number;
  totalSteps: number;
};

export function HomeOnboardingBubble({
  onAdvance,
  step,
  stepIndex,
  totalSteps,
}: HomeOnboardingBubbleProps) {
  const isLastStep = stepIndex === totalSteps - 1;
  const bubbleClassName = [styles.bubble, step.target === "chat" ? styles.bubbleRightAligned : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={bubbleClassName} onClick={onAdvance}>
      <p className={`${styles.title} typo-title4`}>{step.title}</p>
      {step.description ? (
        <p className={`${styles.description} typo-body3`}>{step.description}</p>
      ) : null}

      <div className={styles.bubbleFooter}>
        <Button
          className={styles.nextButton}
          onClick={(event) => {
            event.stopPropagation();
            onAdvance();
          }}
          variant="text"
          color="normal"
        >
          {isLastStep ? "" : "다음"}
        </Button>
        <span className={`${styles.stepCount} typo-caption4`}>
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>
    </section>
  );
}

export default function HomeOnboardingOverlay({ onAdvance }: HomeOnboardingOverlayProps) {
  return (
    <div className={styles.overlayRoot} onClick={onAdvance} aria-hidden="true">
      <div className={styles.dimmer} />

      <SystemIcon name="close" size={24} className={styles.closeButton} />
    </div>
  );
}
