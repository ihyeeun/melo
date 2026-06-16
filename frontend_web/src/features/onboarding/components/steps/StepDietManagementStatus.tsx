import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

import OnboardingOptionCard from "./OnboardingOptionCard";

const DIET_MANAGEMENT_OPTIONS = [
  {
    title: "식단 앱으로\n칼로리·영양소를 기록하고 있어요",
    isNoManagement: false,
  },
  {
    title: "PT나 영양사 등\n전문가 가이드를 받고 있어요",
    isNoManagement: false,
  },
  {
    title: "메뉴 고를 때 의식적으로 신경 써요",
    isNoManagement: false,
  },
  {
    title: "딱히 하고 있는 건 없어요",
    isNoManagement: true,
  },
  {
    title: "기타",
    isNoManagement: false,
  },
] as const;

export default function StepDietManagementStatus({ data, update }: StepComponentProps) {
  const selectedStatuses = data.diet_management_status ?? [];

  const toggleStatus = (index: number) => {
    const isSelected = selectedStatuses.includes(index);
    const selectedOption = DIET_MANAGEMENT_OPTIONS[index];

    if (selectedOption.isNoManagement) {
      update({ diet_management_status: isSelected ? [] : [index] });
      return;
    }

    const statusesWithoutNoManagement = selectedStatuses.filter(
      (value) => !DIET_MANAGEMENT_OPTIONS[value]?.isNoManagement,
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
        {DIET_MANAGEMENT_OPTIONS.map((option, index) => (
          <OnboardingOptionCard
            key={option.title}
            selected={selectedStatuses.includes(index)}
            onClick={() => toggleStatus(index)}
            title={option.title}
          />
        ))}
      </div>
    </section>
  );
}
