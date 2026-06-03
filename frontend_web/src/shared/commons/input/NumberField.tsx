import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import React from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { toOneDecimalPlace } from "@/shared/utils/numberFormat";

import styles from "./NumberField.module.css";

type Props = {
  value?: number;
  onChange: (v?: number) => void;
  min?: number;
  max?: number;
  step?: number;
  snapOnStep?: boolean;
  smallStep?: number;
  largeStep?: number;
  format?: Intl.NumberFormatOptions;
  allowOutOfRange?: boolean;
  unit?: React.ReactNode;
  suffix?: React.ReactNode;
  showControls?: boolean;
  unstyled?: boolean;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementAriaLabel?: string;
  incrementAriaLabel?: string;
  decrementIcon?: React.ReactNode;
  incrementIcon?: React.ReactNode;
  normalizeValue?: (value: number) => number;
  isInputTextAllowed?: (nextInputValue: string) => boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;
  classNames?: {
    root?: string;
    group?: string;
    decrement?: string;
    increment?: string;
    inputWrapper?: string;
    input?: string;
    unit?: string;
  };
};

const NON_CHARACTER_KEYS = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Tab",
  "Enter",
  "Escape",
]);

function getNextInputValue(
  currentValue: string,
  insertedText: string,
  selectionStart: number | null,
  selectionEnd: number | null,
) {
  const start = selectionStart ?? currentValue.length;
  const end = selectionEnd ?? currentValue.length;
  return `${currentValue.slice(0, start)}${insertedText}${currentValue.slice(end)}`;
}

function clampValue(value: number, min?: number, max?: number) {
  const minClampedValue = min === undefined ? value : Math.max(min, value);
  return max === undefined ? minClampedValue : Math.min(max, minClampedValue);
}

function cx(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export default function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  snapOnStep,
  smallStep,
  largeStep,
  format,
  allowOutOfRange = false,
  unit,
  suffix,
  showControls = true,
  unstyled = false,
  decrementDisabled,
  incrementDisabled,
  decrementAriaLabel = "값 감소",
  incrementAriaLabel = "값 증가",
  decrementIcon,
  incrementIcon,
  normalizeValue = toOneDecimalPlace,
  isInputTextAllowed,
  inputRef,
  inputProps,
  classNames,
}: Props) {
  const id = React.useId();
  const {
    className: inputClassName,
    inputMode,
    onKeyDown: onInputKeyDown,
    onPaste: onInputPaste,
    ...restInputProps
  } = inputProps ?? {};
  const decrementClassName = classNames?.decrement ?? (unstyled ? undefined : styles.decrement);
  const incrementClassName = classNames?.increment ?? (unstyled ? undefined : styles.increment);

  return (
    <BaseNumberField.Root
      id={id}
      className={classNames?.root}
      value={value}
      min={min}
      max={max}
      step={step}
      snapOnStep={snapOnStep}
      smallStep={smallStep}
      largeStep={largeStep}
      format={format}
      allowOutOfRange={allowOutOfRange}
      onValueChange={(nextValue, eventDetails) => {
        if (nextValue == null) {
          onChange(undefined);
          return;
        }

        const normalizedValue = normalizeValue(nextValue);
        const nextNormalizedValue = allowOutOfRange
          ? normalizedValue
          : clampValue(normalizedValue, min, max);
        const isDirectInputReason =
          eventDetails.reason === "input-change" ||
          eventDetails.reason === "input-paste" ||
          eventDetails.reason === "input-blur";

        if (
          isDirectInputReason &&
          isInputTextAllowed &&
          !isInputTextAllowed(String(nextNormalizedValue))
        ) {
          return;
        }

        onChange(nextNormalizedValue);
      }}
    >
      <BaseNumberField.Group className={cx(unstyled ? undefined : styles.group, classNames?.group)}>
        {showControls && (
          <BaseNumberField.Decrement
            className={decrementClassName}
            aria-label={decrementAriaLabel}
            disabled={decrementDisabled}
          >
            {decrementIcon ?? <SystemIcon name="circle-minus" mode="image" size={24} />}
          </BaseNumberField.Decrement>
        )}
        <div
          className={cx(
            unstyled ? undefined : styles.inputWrapper,
            unstyled ? undefined : "typo-body1",
            classNames?.inputWrapper,
          )}
        >
          <BaseNumberField.Input
            ref={inputRef}
            className={cx(unstyled ? undefined : styles.input, classNames?.input, inputClassName)}
            inputMode={inputMode ?? "decimal"}
            {...restInputProps}
            onKeyDown={(event) => {
              onInputKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (!isInputTextAllowed) return;
              if (event.nativeEvent.isComposing) return;
              if (event.ctrlKey || event.metaKey || event.altKey) return;
              if (NON_CHARACTER_KEYS.has(event.key)) return;
              if (event.key.length !== 1) return;

              const nextInputValue = getNextInputValue(
                event.currentTarget.value,
                event.key,
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );

              if (isInputTextAllowed(nextInputValue)) return;
              event.preventDefault();
            }}
            onPaste={(event) => {
              onInputPaste?.(event);
              if (event.defaultPrevented) return;
              if (!isInputTextAllowed) return;

              const pastedText = event.clipboardData.getData("text");
              const nextInputValue = getNextInputValue(
                event.currentTarget.value,
                pastedText,
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );

              if (isInputTextAllowed(nextInputValue)) return;
              event.preventDefault();
            }}
          />
          {unit && <span className={cx(unstyled ? undefined : styles.unit, classNames?.unit)}>{unit}</span>}
        </div>
        {suffix}
        {showControls && (
          <BaseNumberField.Increment
            className={incrementClassName}
            aria-label={incrementAriaLabel}
            disabled={incrementDisabled}
          >
            {incrementIcon ?? <SystemIcon name="circle-plus" mode="image" size={24} />}
          </BaseNumberField.Increment>
        )}
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}
