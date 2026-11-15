import { useState } from "react";

import { GOAL_OPTIONS } from "@/features/profile/goalEdit.model";
import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";

// screen: ONB-01-006
export function GoalStep({ form, onNext, nextLabel }: SignUpStepProps<"goal">) {
  const [goal, setGoal] = useState(form.goal);

  return (
    <StepLayout
      title="이루고 싶은 목표가 무엇인가요?"
      canGoNext={goal !== undefined}
      onNext={() => onNext({ goal })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {GOAL_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={goal === option.value}
            onSelect={() => setGoal(option.value)}
          />
        ))}
      </div>
    </StepLayout>
  );
}
