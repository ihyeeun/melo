import { Field, Input } from "@base-ui/react";
import { useEffect, useRef } from "react";

import styles from "@/features/sub-code/styles/SubCodeInputSection.module.css";

type HeadingLevel = "h1" | "h2";

type Props = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  headingLevel?: HeadingLevel;
  maxLength?: number;
};

export function SubCodeInputSection({
  value,
  onChange,
  autoFocus = true,
  headingLevel = "h2",
  maxLength,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Heading = headingLevel;

  useEffect(() => {
    if (!autoFocus) return;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [autoFocus]);

  const handleChange = (nextValue: string) => {
    onChange(maxLength === undefined ? nextValue : nextValue.slice(0, maxLength));
  };

  return (
    <section className={styles.content}>
      <div className={styles.title}>
        <Heading className={`${styles.titleHeading} typo-title1`}>구독 코드를 입력해주세요</Heading>
      </div>

      <Field.Root className={styles.field}>
        <Input
          type="text"
          inputMode="text"
          value={value}
          maxLength={maxLength}
          onChange={(event) => handleChange(event.target.value)}
          className={`${styles.input} typo-h1`}
          placeholder="구독코드"
          aria-label="구독 코드"
          ref={inputRef}
        />
      </Field.Root>
    </section>
  );
}
