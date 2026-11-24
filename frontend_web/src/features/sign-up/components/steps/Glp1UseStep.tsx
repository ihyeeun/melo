import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { MEDICAL, type SignUpStepProps } from "@/features/sign-up/types/signUp.type";

const GLP1_USE_OPTIONS = [
  { value: MEDICAL.NONE, title: "사용한 적 없음" },
  { value: MEDICAL.USE, title: "현재 사용 중" },
  { value: MEDICAL.STOP, title: "과거 사용 경험 있음" },
  { value: MEDICAL.SKIP, title: "응답하고 싶지 않음" },
] as const;

// screen: ONB-01-015
export function Glp1UseStep({ form, onNext, nextLabel }: SignUpStepProps<"glp1">) {
  const [glp1Use, setGlp1Use] = useState(form.glp1_use);

  return (
    <StepLayout
      title={"위고비, 마운자로 등의 주사제를\n사용한 경험이 있으신가요?"}
      canGoNext={glp1Use !== undefined}
      onNext={() => onNext({ glp1_use: glp1Use })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {GLP1_USE_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            selected={glp1Use === option.value}
            onSelect={() => setGlp1Use(option.value)}
          />
        ))}
      </div>
    </StepLayout>
  );
}
