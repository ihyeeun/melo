import { Field } from "@base-ui/react";
import { useState } from "react";

import {
  BODY_RANGE_MESSAGES,
  BODY_VALUE_FRACTION_DIGITS,
  BODY_VALUE_INTEGER_DIGITS,
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { NumberInput } from "@/shared/commons/input/NumberInput";
import { toast } from "@/shared/commons/toast/toast";

// screen: ONB-01-004
export function BodyInfoStep({ form, onNext, nextLabel }: SignUpStepProps<"body">) {
  const [height, setHeight] = useState(form.height);
  const [weight, setWeight] = useState(form.weight);

  // 입력은 자릿수만 막고, 범위는 [다음]을 누를 때 확인한다
  const handleNext = () => {
    if (!isInRange(height, ONBOARDING_HEIGHT_RANGE.min, ONBOARDING_HEIGHT_RANGE.max)) {
      toast.warning(BODY_RANGE_MESSAGES.height);
      return;
    }
    if (!isInRange(weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)) {
      toast.warning(BODY_RANGE_MESSAGES.weight);
      return;
    }
    onNext({ height, weight });
  };

  return (
    <StepLayout
      title="키와 몸무게를 입력해주세요"
      canGoNext={!!height && !!weight}
      onNext={handleNext}
      nextLabel={nextLabel}
    >
      <Field.Root className={styles.fieldGroup}>
        <Field.Label className="body-m-medium text-secondary">키</Field.Label>
        <NumberInput
          value={height}
          onChange={setHeight}
          placeholder="000"
          min={ONBOARDING_HEIGHT_RANGE.min}
          max={ONBOARDING_HEIGHT_RANGE.max}
          step={1}
          unit="cm"
          integerDigits={BODY_VALUE_INTEGER_DIGITS}
          fractionDigits={BODY_VALUE_FRACTION_DIGITS}
          normalizeOnBlur={false}
          autoFocus
        />
      </Field.Root>

      <Field.Root className={styles.fieldGroup}>
        <Field.Label className="body-m-medium text-secondary">몸무게</Field.Label>
        <NumberInput
          value={weight}
          onChange={setWeight}
          placeholder="000.0"
          min={ONBOARDING_WEIGHT_RANGE.min}
          max={ONBOARDING_WEIGHT_RANGE.max}
          step={0.1}
          unit="kg"
          integerDigits={BODY_VALUE_INTEGER_DIGITS}
          fractionDigits={BODY_VALUE_FRACTION_DIGITS}
          normalizeOnBlur={false}
        />
      </Field.Root>
    </StepLayout>
  );
}
