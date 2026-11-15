import { Field } from "@base-ui/react";
import { useState } from "react";

import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { NumberInput } from "@/shared/commons/input/NumberInput";

// screen: ONB-01-004
export function BodyInfoStep({ form, onNext, nextLabel }: SignUpStepProps<"body">) {
  const [height, setHeight] = useState(form.height);
  const [weight, setWeight] = useState(form.weight);

  return (
    <StepLayout
      title="키와 몸무게를 입력해주세요"
      canGoNext={
        isInRange(height, ONBOARDING_HEIGHT_RANGE.min, ONBOARDING_HEIGHT_RANGE.max) &&
        isInRange(weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)
      }
      onNext={() => onNext({ height, weight })}
      nextLabel={nextLabel}
    >
      <Field.Root className={styles.fieldGroup}>
        <Field.Label className="body-m-medium text-secondary">키</Field.Label>
        <NumberInput
          value={height}
          onChange={(nextHeight) => {
            if (nextHeight !== undefined && nextHeight > ONBOARDING_HEIGHT_RANGE.max) return;
            setHeight(nextHeight);
          }}
          placeholder="000"
          min={ONBOARDING_HEIGHT_RANGE.min}
          max={ONBOARDING_HEIGHT_RANGE.max}
          step={1}
          unit="cm"
          normalizeOnBlur={false}
          autoFocus
        />
      </Field.Root>

      <Field.Root className={styles.fieldGroup}>
        <Field.Label className="body-m-medium text-secondary">몸무게</Field.Label>
        <NumberInput
          value={weight}
          onChange={(nextWeight) => {
            if (nextWeight !== undefined && nextWeight > ONBOARDING_WEIGHT_RANGE.max) return;
            setWeight(nextWeight);
          }}
          placeholder="000.0"
          min={ONBOARDING_WEIGHT_RANGE.min}
          max={ONBOARDING_WEIGHT_RANGE.max}
          step={0.1}
          unit="kg"
          normalizeOnBlur={false}
        />
      </Field.Root>
    </StepLayout>
  );
}
