import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { EXERCISE, type SignUpStepProps } from "@/features/sign-up/types/signUp.type";

const EXERCISE_OPTIONS = [
  { value: EXERCISE.NONE, title: "운동하지 않음" },
  { value: EXERCISE.S, title: "주 1~2회" },
  { value: EXERCISE.M, title: "주 3~4회" },
  { value: EXERCISE.L, title: "주 5회 이상" },
] as const;

// screen: ONB-01-014
export function ExerciseFrequencyStep({ form, onNext, nextLabel }: SignUpStepProps<"exercise">) {
  const [frequency, setFrequency] = useState(form.exercise_freq_weekly);

  return (
    <StepLayout
      title="일주일에 운동을 몇 번 하시나요?"
      canGoNext={frequency !== undefined}
      onNext={() => onNext({ exercise_freq_weekly: frequency })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {EXERCISE_OPTIONS.map((option) => (
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
