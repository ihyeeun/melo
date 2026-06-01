import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

const JOB_TYPE_OPTIONS = ["직장인", "프리랜서", "학생", "기타"] as const;

const LUNCH_LOCATION_OPTIONS = [
  "회사 근처 식당·배달",
  "구내식당",
  "도시락 지참",
  "재택으로 집에서",
  "기타",
] as const;

export default function StepJobAndLunchLocation({ data, update }: StepComponentProps) {
  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">하는 일이 무엇인가요?</h2>
      </div>

      <div className={styles.onboardingChipGroup}>
        {JOB_TYPE_OPTIONS.map((label, index) => {
          const selected = data.job_type === index;

          return (
            <button
              key={label}
              type="button"
              className={[
                styles.onboardingChoiceChip,
                selected ? styles.onboardingChoiceChipActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={selected}
              onClick={() => update({ job_type: index })}
            >
              <span className="typo-title3">{label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">주로 어디서 점심을 드시나요?</h2>
      </div>

      <div className={styles.onboardingOptionList}>
        {LUNCH_LOCATION_OPTIONS.map((title, index) => (
          <OnboardingOptionCard
            key={title}
            selected={data.lunch_location === index}
            onClick={() => update({ lunch_location: index })}
            title={title}
          />
        ))}
      </div>
    </section>
  );
}
