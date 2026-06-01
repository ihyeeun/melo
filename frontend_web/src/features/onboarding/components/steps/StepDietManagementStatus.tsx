import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

const DIET_MANAGEMENT_OPTIONS = [
  "식단 앱으로\n칼로리·영양소를 기록하고 있어요",
  "PT나 영양사 등\n전문가 가이드를 받고 있어요",
  "따로 기록하진 않지만,\n메뉴 고를 때 의식적으로 신경 써요",
  "딱히 하고 있는 건 없어요",
  "기타",
] as const;

const NO_MANAGEMENT_OPTION_INDEX = 3;

export default function StepDietManagementStatus({ data, update }: StepComponentProps) {
  const selectedStatuses = data.diet_management_status ?? [];

  const toggleStatus = (index: number) => {
    const isSelected = selectedStatuses.includes(index);

    if (index === NO_MANAGEMENT_OPTION_INDEX) {
      update({ diet_management_status: isSelected ? [] : [NO_MANAGEMENT_OPTION_INDEX] });
      return;
    }

    const statusesWithoutNoManagement = selectedStatuses.filter(
      (value) => value !== NO_MANAGEMENT_OPTION_INDEX,
    );
    const nextStatuses = isSelected
      ? statusesWithoutNoManagement.filter((value) => value !== index)
      : [...statusesWithoutNoManagement, index];

    update({ diet_management_status: nextStatuses });
  };

  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">
          식단 관리를 위해
          <br />
          지금 하고 있는 것이 있나요?
        </h2>
        <p className={`${styles.textAlternative} typo-body2`}>복수 선택 가능</p>
      </div>

      <div className={styles.onboardingOptionList}>
        {DIET_MANAGEMENT_OPTIONS.map((title, index) => (
          <OnboardingOptionCard
            key={title}
            selected={selectedStatuses.includes(index)}
            onClick={() => toggleStatus(index)}
            title={title}
          />
        ))}
      </div>
    </section>
  );
}
