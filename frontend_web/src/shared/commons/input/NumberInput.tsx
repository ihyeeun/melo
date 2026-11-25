import { Input } from "@base-ui/react/input";

import styles from "./NumberInput.module.css";

type Props = {
  value?: number;
  onChange: (v?: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  inputMode?: "numeric" | "decimal";
  normalizeOnBlur?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  // 자릿수 제한 (예: 정수 3 · 소수 1 → 999.9까지). 범위는 따로 확인한다
  integerDigits?: number;
  fractionDigits?: number;
};

function clamp(n: number, min?: number, max?: number) {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  unit,
  inputMode = "decimal",
  normalizeOnBlur = true,
  inputRef,
  autoFocus,
  integerDigits,
  fractionDigits,
}: Props) {
  const digitPattern =
    integerDigits === undefined
      ? undefined
      : new RegExp(`^\\d{0,${integerDigits}}(\\.\\d{0,${fractionDigits ?? 0}})?$`);

  return (
    <div className={`${styles.inputBox} title-xl-medium`}>
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        className={`${styles.input} title-xl-medium`}
        type="number"
        inputMode={inputMode}
        value={value ?? ""}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const raw = e.target.value;

          if (raw === "") return onChange(undefined);
          if (digitPattern && !digitPattern.test(raw)) return;

          const num = Number(raw);
          if (!Number.isNaN(num)) {
            onChange(Number(num.toFixed(1)));
          }
        }}
        onBlur={(e) => {
          if (!normalizeOnBlur) return;

          const raw = e.target.value;
          if (raw === "") return;

          const num = Number(raw);
          if (Number.isNaN(num)) return;

          const fixed = clamp(num, min, max);

          // 범위 밖이었으면 값 보정
          if (fixed !== num) onChange(fixed);
        }}
      />
      {unit && <span className={styles.unit}>{unit}</span>}
    </div>
  );
}
