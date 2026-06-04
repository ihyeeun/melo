import { Field } from "@base-ui/react";
import { useEffect, useRef } from "react";

import { ONBOARDING_WEIGHT_RANGE } from "@/features/onboarding/constants/inputRanges";
import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";
import { NumberInput } from "@/shared/commons/input/NumberInput";

export default function StepGoalWeight({ data, update }: StepComponentProps) {
  const diff =
    data.target_weight !== undefined && data.weight !== undefined
      ? Math.round((data.target_weight - data.weight) * 10) / 10
      : undefined;

  const diffLabel =
    diff === undefined ? undefined : Number.isInteger(diff) ? diff.toString() : diff.toFixed(1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={`${styles.onboardingTitle} ${styles.onboardingTitleGroup}`}>
        <h2 className="typo-title1">목표 몸무게가 몇인가요?</h2>
        {diff !== undefined && (
          <p className={`${styles.textAlternative} typo-body2`}>
            현재 몸무게 기준 {diff > 0 ? "+" : ""}
            {diffLabel}kg
          </p>
        )}
      </div>

      <Field.Root className={styles.onboardingFieldPadding}>
        <div className={styles.onboardingGoalWeightCard}>
          <NumberInput
            value={data.target_weight}
            onChange={(value) => update({ target_weight: value })}
            placeholder="55"
            min={ONBOARDING_WEIGHT_RANGE.min}
            max={ONBOARDING_WEIGHT_RANGE.max}
            step={0.1}
            unit="kg"
            normalizeOnBlur={false}
            inputRef={inputRef}
          />
        </div>
      </Field.Root>
    </section>
  );
}
