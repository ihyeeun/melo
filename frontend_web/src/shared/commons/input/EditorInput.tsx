import { Input } from "@base-ui/react/input";

import styles from "./EditorInput.module.css";

type Props = Omit<React.ComponentProps<"input">, "onChange" | "value" | "min" | "max"> & {
  unit?: string;
  value?: number;
  min?: number;
  max?: number;
  fractionDigits?: number;
  blockOutOfRangeInput?: boolean;
  clampOnChange?: boolean;
  normalizeOnBlur?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (v?: number) => void;
};

function clamp(n: number, min?: number, max?: number) {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

export function EditorInput({
  unit,
  onChange,
  value,
  min,
  max,
  fractionDigits,
  blockOutOfRangeInput = false,
  clampOnChange = true,
  normalizeOnBlur = true,
  inputRef,
  ...props
}: Props) {
  return (
    <div className={styles.inputBox}>
      <Input
        {...props}
        ref={inputRef}
        className={`typo-body3 ${styles.input}`}
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = e.target.value;

          if (raw === "") {
            onChange(undefined);
            return;
          }

          if (fractionDigits !== undefined) {
            const safeDigits = Math.max(0, Math.trunc(fractionDigits));
            const decimalPattern = new RegExp(`^-?\\d*(\\.\\d{0,${safeDigits}})?$`);

            if (!decimalPattern.test(raw)) return;
          }

          const num = Number(raw);
          if (Number.isNaN(num)) return;

          const isBelowMin = min !== undefined && num < min;
          const isAboveMax = max !== undefined && num > max;
          if (blockOutOfRangeInput && (isBelowMin || isAboveMax)) return;

          const fixed = clampOnChange ? clamp(num, min, max) : num;

          onChange(fixed);
        }}
        onBlur={() => {
          if (!normalizeOnBlur) return;

          if (value !== undefined) {
            onChange(clamp(value, min, max));
          }
        }}
      />
      {unit && <span className={`typo-caption1 ${styles.unit}`}>{unit}</span>}
    </div>
  );
}
