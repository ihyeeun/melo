import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

const EATING_OUT_FREQUENCY_OPTIONS = ["주 0~2회", "주 3~4회", "주 5회 이상"] as const;

export default function StepEatingOutFrequency({ data, update }: StepComponentProps) {
  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">
          일주일에 외식·배달을
          <br />
          몇 번 하시나요?
        </h2>
      </div>

      <div className={styles.onboardingOptionList}>
        {EATING_OUT_FREQUENCY_OPTIONS.map((title, index) => (
          <OnboardingOptionCard
            key={title}
            selected={data.eating_out_freq_weekly === index}
            onClick={() => update({ eating_out_freq_weekly: index })}
            title={title}
          />
        ))}
      </div>
    </section>
  );
}
