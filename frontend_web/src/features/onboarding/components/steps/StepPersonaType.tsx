import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

const PERSONA_TYPE_OPTIONS = [
  "칼로리·영양성분을 직접 검색해요",
  "안전한 메뉴(샐러드 등)를 반복해요",
  "덜 부담스러워 보이는 음식을 감으로 골라요",
] as const;

export default function StepPersonaType({ data, update }: StepComponentProps) {
  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">
          건강하게 먹으려 할 때,
          <br />
          가장 자주 하는 행동은 무엇인가요?
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
