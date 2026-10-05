import { Radio, RadioGroup } from "@base-ui/react";
import type { FocusEventHandler, InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

import { NUTRIENT_FORM_CONFIG } from "@/features/nutrient-entry/constants/nutrientDetailForm";
import styles from "@/features/nutrient-entry/styles/NutrientDetailForm.module.css";
import type { MenuNutrientFields, MenuUnit } from "@/shared/api/types/api.dto";

type Props = {
  totalWeight?: number;
  onTotalWeightChange: (nextWeight: number | undefined) => void;
  totalCalories?: number;
  onTotalCaloriesChange: (nextCalories: number | undefined) => void;
  form?: Partial<MenuNutrientFields>;
  onFieldChange: (key: keyof MenuNutrientFields, nextValue: string) => void;
  weightUnit: MenuUnit;
  onWeightUnitChange: (nextUnit: MenuUnit) => void;
};

const WEIGHT_UNIT_OPTIONS: Array<{ label: string; value: MenuUnit }> = [
  { label: "g", value: 0 },
  { label: "ml", value: 1 },
];
const MAX_INPUT_VALUE = 9999.9;

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function formatSingleDecimalValue(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

function sanitizeSingleDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const [integerPart = "", ...decimalParts] = cleaned.split(".");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join("").slice(0, 1)}`;
}

function parseSingleDecimalInput(value: string, min = 0, max = MAX_INPUT_VALUE) {
  const sanitized = sanitizeSingleDecimalInput(value);

  if (sanitized === "" || sanitized === ".") {
    return undefined;
  }

  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const clamped = Math.min(max, Math.max(min, parsed));
  return roundToSingleDecimal(clamped);
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type SingleDecimalInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode" | "min" | "max" | "step"
> & {
  value?: number;
  onValueChange: (nextValue: number | undefined) => void;
  min?: number;
  max?: number;
};

function SingleDecimalInput({
  value,
  onValueChange,
  min = 0,
  max = MAX_INPUT_VALUE,
  onBlur,
  onFocus,
  ...inputProps
}: SingleDecimalInputProps) {
  const [draftValue, setDraftValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = isFocused ? draftValue : formatSingleDecimalValue(value);

  const normalizeDraftValue = (nextDraftValue: string) => {
    const parsedValue = parseSingleDecimalInput(nextDraftValue, min, max);
    const normalizedValue = formatSingleDecimalValue(parsedValue);

    setDraftValue(normalizedValue);
    onValueChange(parsedValue);
  };

  const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
    setDraftValue(event.currentTarget.value);
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    setIsFocused(false);
    normalizeDraftValue(event.currentTarget.value);
    onBlur?.(event);
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]?"
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextDraftValue = sanitizeSingleDecimalInput(event.target.value);

        setDraftValue(nextDraftValue);
        onValueChange(parseSingleDecimalInput(nextDraftValue, min, max));
      }}
    />
  );
}

export function NutrientDetailForm({
  totalWeight,
  onTotalWeightChange,
  totalCalories,
  onTotalCaloriesChange,
  form,
  onFieldChange,
  weightUnit,
  onWeightUnitChange,
}: Props) {
  return (
    <>
      <FieldSection label="총 용량">
        <div className={styles.weightRow}>
          <SingleDecimalInput
            className={`body-l-regular ${styles.input} amp-unmask`}
            placeholder="0"
            aria-label="총 용량 입력"
            value={totalWeight}
            onValueChange={onTotalWeightChange}
            max={MAX_INPUT_VALUE}
            min={0}
          />

          <RadioGroup<MenuUnit>
            className={styles.weightRow}
            aria-label="용량 단위"
            value={weightUnit}
            onValueChange={onWeightUnitChange}
          >
            {WEIGHT_UNIT_OPTIONS.map((option) => (
              <Radio.Root
                key={option.value}
                value={option.value}
                nativeButton
                render={<button type="button" />}
                className={`body-l-regular ${styles.unitButton}`}
              >
                {option.label}
              </Radio.Root>
            ))}
          </RadioGroup>
        </div>
      </FieldSection>

      <FieldSection label="총 칼로리" description="(kcal)">
        <SingleDecimalInput
          className={`body-l-regular ${styles.input} amp-unmask`}
          placeholder="0"
          aria-label="총 칼로리 입력"
          value={totalCalories}
          onValueChange={onTotalCaloriesChange}
          max={MAX_INPUT_VALUE}
          min={0}
        />
      </FieldSection>

      <section id="nutrientDetailForm" className={styles.nutrientList}>
        {NUTRIENT_FORM_CONFIG.map((field, index) => {
          const fieldValue = form?.[field.key];
          const isMainField = field.variant === "main";
          const nextField = NUTRIENT_FORM_CONFIG[index + 1];
          const isLastSubField =
            !isMainField &&
            (nextField?.variant !== "sub" || nextField?.group !== field.group);

          return (
            <div
              key={field.key}
              data-last-sub={isLastSubField ? "true" : undefined}
              className={cx(
                styles.fieldRow,
                isMainField ? styles.fieldRowMain : styles.fieldRowSub,
              )}
            >
              <p className={`body-l-medium text-secondary`}>
                {field.label}
                <span className={`body-s-regular text-tertiary`}> ({field.unit})</span>
              </p>
              <SingleDecimalInput
                className={`body-l-regular ${styles.input} amp-unmask`}
                value={fieldValue}
                onValueChange={(nextValue) => {
                  onFieldChange(field.key, nextValue === undefined ? "" : String(nextValue));
                }}
                aria-label={`${field.label} 입력`}
                placeholder="0"
                max={MAX_INPUT_VALUE}
                min={0}
              />
            </div>
          );
        })}
      </section>
    </>
  );
}

function FieldSection({
  label,
  description,
  require = true,
  children,
}: {
  label: string;
  description?: string;
  require?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.fieldSection}>
      <div className={styles.labelArea}>
        <h2 className="title-s-semi text-primary">
          {label}
          {description && <span className="body-l-regular text-tertiary">{description}</span>}
        </h2>
        {require && <p className={`caption-m-medium ${styles.require}`}>* 필수로 입력해주세요</p>}
      </div>

      {children}
    </div>
  );
}
