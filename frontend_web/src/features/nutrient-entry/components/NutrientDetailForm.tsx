import { Select } from "@base-ui/react";
import { ChevronDown } from "lucide-react";
import type { FocusEventHandler, InputHTMLAttributes } from "react";
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
  const selectedWeightUnitLabel =
    WEIGHT_UNIT_OPTIONS.find((option) => option.value === weightUnit)?.label ?? "g";

  return (
    <section className={styles.formSection}>
      <div className={styles.topFieldSection}>
        <div className={styles.titleRow}>
          <p className={`typo-title4 ${styles.titleText}`}>총 용량</p>
          <p className={`typo-body3 ${styles.requiredText}`}>* 필수로 작성해주세요</p>
        </div>
        <div className={styles.weightRow}>
          <SingleDecimalInput
            className={`typo-body3 ${styles.valueInput}`}
            placeholder="0"
            aria-label="총 용량 입력"
            value={totalWeight}
            onValueChange={onTotalWeightChange}
            max={MAX_INPUT_VALUE}
            min={0}
          />

          <Select.Root
            value={weightUnit}
            onValueChange={(nextValue) => {
              if (nextValue === 0 || nextValue === 1) {
                onWeightUnitChange(nextValue);
              }
            }}
          >
            <Select.Trigger
              className={`typo-body3 ${styles.valueInput} ${styles.selectTrigger}`}
              aria-label="중량 단위 선택"
            >
              <Select.Value>{selectedWeightUnitLabel}</Select.Value>
              <Select.Icon className={styles.selectIcon} aria-hidden>
                <ChevronDown size={20} />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Positioner className={styles.selectPositioner}>
                <Select.Popup className={styles.selectPopup}>
                  <Select.List className={styles.selectList}>
                    {WEIGHT_UNIT_OPTIONS.map((option) => (
                      <Select.Item
                        key={option.value}
                        value={option.value}
                        className={`typo-body3 ${styles.selectItem}`}
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      <div className={styles.topFieldSection}>
        <div className={styles.titleRow}>
          <p className={`typo-title4 ${styles.titleText}`}>
            총 칼로리 <span className={`typo-caption3 ${styles.titleUnit}`}>(kcal)</span>
          </p>
          <p className={`typo-body3 ${styles.requiredText}`}>* 필수로 작성해주세요</p>
        </div>
        <SingleDecimalInput
          className={`typo-body3 ${styles.valueInput}`}
          placeholder="0"
          aria-label="총 칼로리 입력"
          value={totalCalories}
          onValueChange={onTotalCaloriesChange}
          max={MAX_INPUT_VALUE}
          min={0}
        />
      </div>

      <section id="nutrientDetailForm" className={styles.nutrientList}>
        {NUTRIENT_FORM_CONFIG.map((field, index) => {
          const prevField = NUTRIENT_FORM_CONFIG[index - 1];
          const shouldRenderDivider = index > 0 && prevField?.group !== field.group;
          const fieldValue = form?.[field.key];
          const isMainField = field.variant === "main";

          return (
            <div key={field.key}>
              {shouldRenderDivider && <div className="divider dividerMargin16" />}

              <div
                className={cx(
                  styles.fieldRow,
                  isMainField ? styles.fieldRowMain : styles.fieldRowSub,
                )}
              >
                <p
                  className={cx(
                    isMainField ? "typo-title4" : "typo-body3",
                    styles.fieldLabel,
                    isMainField ? styles.fieldLabelMain : styles.fieldLabelSub,
                  )}
                >
                  {field.label}
                  <span className={`typo-label3 ${styles.unitText}`}> ({field.unit})</span>
                </p>
                <SingleDecimalInput
                  className={`typo-body3 ${styles.nutrientInput}`}
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
            </div>
          );
        })}
      </section>
    </section>
  );
}
