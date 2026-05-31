import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

const PERSONA_TYPE_OPTIONS = [
  "칼로리·영양성분을 직접 검색해요",
  "평소 먹던 안전한 메뉴를 반복해요",
  "덜 부담스러워 보이는 걸 감으로 골라요",
] as const;

export default function StepPersonaType({ data, update }: StepComponentProps) {
  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">
          가볍게 먹으려 할 때,
          <br />
          어떻게 하시나요?
        </h2>
      </div>

      <div className={styles.onboardingOptionList}>
        {PERSONA_TYPE_OPTIONS.map((title, index) => (
          <OnboardingOptionCard
            key={title}
            selected={data.persona_type === index}
            onClick={() => update({ persona_type: index })}
            title={title}
          />
        ))}
      </div>
    </section>
  );
}
