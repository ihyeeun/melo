import { useState } from "react";

import { isInRange, ONBOARDING_WEIGHT_RANGE } from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { NumberInput } from "@/shared/commons/input/NumberInput";

function formatWeightDiff(weight?: number, targetWeight?: number) {
  if (weight === undefined || targetWeight === undefined) return undefined;

  const diff = Math.round((targetWeight - weight) * 10) / 10;
  return `${diff > 0 ? "+" : ""}${diff}kg`;
}

export function GoalWeightStep({ form, onNext, nextLabel }: SignUpStepProps<"goalWeight">) {
  const [targetWeight, setTargetWeight] = useState(form.target_weight);
  const weightDiff = formatWeightDiff(form.weight, targetWeight);

  return (
    <StepLayout
      title="목표 몸무게가 몇 kg인가요?"
      canGoNext={isInRange(targetWeight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)}
      onNext={() => onNext({ target_weight: targetWeight })}
      nextLabel={nextLabel}
    >
      <NumberInput
        value={targetWeight}
        onChange={(nextWeight) => {
          if (nextWeight !== undefined && nextWeight > ONBOARDING_WEIGHT_RANGE.max) return;
          setTargetWeight(nextWeight);
        }}
        placeholder="000.0"
        min={ONBOARDING_WEIGHT_RANGE.min}
        max={ONBOARDING_WEIGHT_RANGE.max}
        step={0.1}
        unit="kg"
        normalizeOnBlur={false}
        autoFocus
      />

      {weightDiff ? (
        <p className={`${styles.helperText} body-l-regular text-secondary`}>
          현재 몸무게 기준 {weightDiff}
        </p>
      ) : null}
    </StepLayout>
  );
}
