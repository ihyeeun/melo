import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { MEAL_OUTSIDE, type SignUpStepProps } from "@/features/sign-up/types/signUp.type";

const EATING_OUT_OPTIONS = [
  { value: MEAL_OUTSIDE.S, title: "주 0~2회" },
  { value: MEAL_OUTSIDE.M, title: "주 3~4회" },
  { value: MEAL_OUTSIDE.L, title: "주 5회 이상" },
] as const;

// screen: ONB-01-012
export function EatingOutFrequencyStep({ form, onNext, nextLabel }: SignUpStepProps<"eatingOut">) {
  const [frequency, setFrequency] = useState(form.eating_out_freq_weekly);

  return (
    <StepLayout
      title={"일주일에 외식(배달/포장 포함)을\n몇 번 하시나요?"}
      canGoNext={frequency !== undefined}
      onNext={() => onNext({ eating_out_freq_weekly: frequency })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {EATING_OUT_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            selected={frequency === option.value}
            onSelect={() => setFrequency(option.value)}
          />
        ))}
      </div>
    </StepLayout>
  );
}
