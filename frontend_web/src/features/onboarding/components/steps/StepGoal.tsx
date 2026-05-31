import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

export default function StepGoal({ data, update }: StepComponentProps) {
  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">이루고 싶은 목표가 무엇인가요?</h2>
      </div>

      <div className={styles.onboardingOptionList}>
        <OnboardingOptionCard
          selected={data.goal === 0}
          onClick={() => update({ goal: 0 })}
          title="다이어트"
          description="체지방을 줄이고 싶어요"
        />
        <OnboardingOptionCard
          selected={data.goal === 1}
          onClick={() => update({ goal: 1 })}
          title="체중 유지"
          description="지금의 몸무게를 유지하고 싶어요"
        />
        <OnboardingOptionCard
          selected={data.goal === 2}
          onClick={() => update({ goal: 2 })}
          title="근육 늘리기"
          description="근육량을 늘리고 싶어요"
        />
      </div>
    </section>
  );
}
