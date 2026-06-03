import "@/shared/commons/input/input.css";

import { Field, Input } from "@base-ui/react";
import { useEffect, useRef } from "react";

import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

export default function StepSubscribedCode({ data, update }: StepComponentProps) {
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
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">구독 코드를 입력해주세요</h2>
      </div>
      <Field.Root className={styles.onboardingFieldPadding}>
        <Input
          type="text"
          inputMode="text"
          placeholder="구독코드"
          aria-label="구독 코드"
          className={`input ${styles.onboardingSubscribeInput}`}
          value={data.subCode ?? ""}
          onChange={(e) => update({ subCode: e.target.value })}
          ref={inputRef}
        />
      </Field.Root>
    </section>
  );
}
