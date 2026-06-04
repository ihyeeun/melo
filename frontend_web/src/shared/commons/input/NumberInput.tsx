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
}: Props) {
  return (
    <div className={`${styles.inputBox} typo-h1`}>
      <Input
        ref={inputRef}
        className={`${styles.input} typo-h1`}
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
