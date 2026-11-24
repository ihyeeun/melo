import { useState } from "react";

import {
  BODY_RANGE_MESSAGES,
  BODY_VALUE_FRACTION_DIGITS,
  BODY_VALUE_INTEGER_DIGITS,
  isGoalWeightRangeValid,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { NumberInput } from "@/shared/commons/input/NumberInput";
import { toast } from "@/shared/commons/toast/toast";

function formatWeightDiff(weight?: number, targetWeight?: number) {
  if (weight === undefined || targetWeight === undefined) return undefined;

  const diff = Math.round((targetWeight - weight) * 10) / 10;
  return `${diff > 0 ? "+" : ""}${diff}kg`;
}

// screen: ONB-01-007
export function GoalWeightStep({ form, onNext, nextLabel }: SignUpStepProps<"goalWeight">) {
  const [targetWeight, setTargetWeight] = useState(form.target_weight);
  const weightDiff = formatWeightDiff(form.weight, targetWeight);

  // 입력은 자릿수만 막고, 범위는 [다음]을 누를 때 확인한다
  const handleNext = () => {
    if (!isGoalWeightRangeValid({ target_weight: targetWeight })) {
      toast.warning(BODY_RANGE_MESSAGES.targetWeight);
      return;
    }
    onNext({ target_weight: targetWeight });
  };

  return (
    <StepLayout
      title="목표 몸무게가 몇 kg인가요?"
      canGoNext={!!targetWeight}
      onNext={handleNext}
      nextLabel={nextLabel}
    >
      <NumberInput
        value={targetWeight}
        onChange={setTargetWeight}
        placeholder="000.0"
        min={ONBOARDING_WEIGHT_RANGE.min}
        max={ONBOARDING_WEIGHT_RANGE.max}
        step={0.1}
        unit="kg"
        integerDigits={BODY_VALUE_INTEGER_DIGITS}
        fractionDigits={BODY_VALUE_FRACTION_DIGITS}
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
