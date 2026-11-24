import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import {
  MEAL_MANAGEMENT,
  type SignUpStepProps,
  type SignUpType,
} from "@/features/sign-up/types/signUp.type";

type DietManagementStatus = SignUpType["diet_management_status"][number];

const DIET_MANAGEMENT_OPTIONS = [
  { value: MEAL_MANAGEMENT.APP, title: "식단 앱으로\n칼로리·영양소를 기록하고 있어요" },
  { value: MEAL_MANAGEMENT.PT, title: "PT나 영양사 등\n전문가 가이드를 받고 있어요" },
  {
    value: MEAL_MANAGEMENT.NO_RECORD,
    title: "따로 기록하진 않지만,\n메뉴 고를 때 의식적으로 신경 써요",
  },
  { value: MEAL_MANAGEMENT.NONE, title: "딱히 하고 있는 건 없어요" },
  { value: MEAL_MANAGEMENT.ETC, title: "기타" },
] as const;

// "딱히 하고 있는 건 없어요"는 다른 항목과 함께 고를 수 없다
function toggleStatus(selected: DietManagementStatus[], value: DietManagementStatus) {
  if (value === MEAL_MANAGEMENT.NONE) {
    return selected.includes(value) ? [] : [value];
  }

  const withoutNone = selected.filter((status) => status !== MEAL_MANAGEMENT.NONE);

  return withoutNone.includes(value)
    ? withoutNone.filter((status) => status !== value)
    : [...withoutNone, value];
}

// screen: ONB-01-010
export function DietManagementStep({ form, onNext, nextLabel }: SignUpStepProps<"dietManagement">) {
  const [statuses, setStatuses] = useState(form.diet_management_status ?? []);

  return (
    <StepLayout
      title={"식단 관리를 위해\n지금 하고 있는 것이 있나요?"}
      description="* 복수 선택 가능"
      canGoNext={statuses.length > 0}
      onNext={() => onNext({ diet_management_status: statuses })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {DIET_MANAGEMENT_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            selected={statuses.includes(option.value)}
            onSelect={() => setStatuses((prev) => toggleStatus(prev, option.value))}
          />
        ))}
      </div>
    </StepLayout>
  );
}
