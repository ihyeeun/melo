import { useState } from "react";

import { ACTIVITY_OPTIONS } from "@/features/profile/goalEdit.model";
import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";

// screen: ONB-01-005
export function ActivityLevelStep({ form, onNext, nextLabel }: SignUpStepProps<"activity">) {
  const [activity, setActivity] = useState(form.activity);

  return (
    <StepLayout
      title="평소에 얼마나 움직이시나요?"
      canGoNext={activity !== undefined}
      onNext={() => onNext({ activity })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {ACTIVITY_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={activity === option.value}
            onSelect={() => setActivity(option.value)}
          />
        ))}
      </div>
    </StepLayout>
  );
}
