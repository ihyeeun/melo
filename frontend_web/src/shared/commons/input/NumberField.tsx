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
  /**
   * Maximum decimal places.
   * Extra typed or pasted digits are rejected, while numeric changes are rounded to this precision.
   */
  fractionDigits?: number;
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
const DIGITS_PATTERN = /^\d*$/;
const REDUNDANT_LEADING_ZEROS_PATTERN = /^(-?)0+(?=\d)/;
const MAX_FRACTION_DIGITS = 20;

function getSafeFractionDigits(fractionDigits?: number) {
  if (fractionDigits === undefined) return undefined;
  if (!Number.isFinite(fractionDigits)) return 0;

  return Math.min(MAX_FRACTION_DIGITS, Math.max(0, Math.trunc(fractionDigits)));
}

function roundToFractionDigits(value: number, fractionDigits: number) {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

function removeRedundantLeadingZeros(inputValue: string) {
  return inputValue.replace(REDUNDANT_LEADING_ZEROS_PATTERN, "$1");
}

function replaceInputValuePreservingCaret(input: HTMLInputElement, nextValue: string) {
  const removedCharacterCount = input.value.length - nextValue.length;
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;

  input.value = nextValue;

  if (selectionStart === null || selectionEnd === null) return;

  const nextSelectionStart = Math.max(0, selectionStart - removedCharacterCount);
  const nextSelectionEnd = Math.max(0, selectionEnd - removedCharacterCount);
  input.setSelectionRange(nextSelectionStart, nextSelectionEnd);
}

function isNumericInputTextAllowed(
  inputValue: string,
  fractionDigits: number | undefined,
  allowsNegativeInput: boolean,
) {
  let unsignedValue = inputValue;

  if (unsignedValue.startsWith("-")) {
    if (!allowsNegativeInput) return false;
    unsignedValue = unsignedValue.slice(1);
  }

  if (unsignedValue.includes("-")) return false;

  const decimalParts = unsignedValue.split(".");
  if (decimalParts.length > 2) return false;
  if (!decimalParts.every((part) => DIGITS_PATTERN.test(part))) return false;
  if (fractionDigits === undefined) return true;

  const decimalPart = decimalParts[1];
  if (decimalPart === undefined) return true;

  return fractionDigits > 0 && decimalPart.length <= fractionDigits;
}

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
  fractionDigits,
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
  normalizeValue,
  isInputTextAllowed,
  inputRef,
  inputProps,
  classNames,
}: Props) {
  const id = React.useId();
  const safeFractionDigits = getSafeFractionDigits(fractionDigits);
  const shouldUseFractionDigitsPolicy = fractionDigits !== undefined;
  const allowsNegativeInput = min === undefined || min < 0;
  const inputTextValidator =
    shouldUseFractionDigitsPolicy || isInputTextAllowed
      ? (nextInputValue: string) => {
          const isAllowedByFractionDigitsPolicy =
            !shouldUseFractionDigitsPolicy ||
            isNumericInputTextAllowed(
              nextInputValue,
              safeFractionDigits,
              allowsNegativeInput,
            );

          return (
            isAllowedByFractionDigitsPolicy && (isInputTextAllowed?.(nextInputValue) ?? true)
          );
        }
      : undefined;
  const resolvedFormat =
    safeFractionDigits === undefined
      ? format
      : {
          ...format,
          maximumFractionDigits: safeFractionDigits,
          ...(format?.minimumFractionDigits !== undefined
            ? { minimumFractionDigits: Math.min(format.minimumFractionDigits, safeFractionDigits) }
            : {}),
        };
  const normalizeNumericValue = (nextValue: number) => {
    const normalizedValue = normalizeValue
      ? normalizeValue(nextValue)
      : safeFractionDigits === undefined
        ? toOneDecimalPlace(nextValue)
        : roundToFractionDigits(nextValue, safeFractionDigits);

    return allowOutOfRange ? normalizedValue : clampValue(normalizedValue, min, max);
  };
  const {
    className: inputClassName,
    inputMode,
    onBeforeInput: onInputBeforeInput,
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
      value={value ?? null}
      min={min}
      max={max}
      step={step}
      snapOnStep={snapOnStep}
      smallStep={smallStep}
      largeStep={largeStep}
      format={resolvedFormat}
      allowOutOfRange={allowOutOfRange}
      onValueChange={(nextValue, eventDetails) => {
        if (nextValue == null) {
          onChange(undefined);
          return;
        }

        const nextNormalizedValue = normalizeNumericValue(nextValue);
        const isDirectInputReason =
          eventDetails.reason === "input-change" ||
          eventDetails.reason === "input-paste" ||
          eventDetails.reason === "input-blur";

        if (
          isDirectInputReason &&
          inputTextValidator &&
          !inputTextValidator(String(nextNormalizedValue))
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
            {decrementIcon ?? <SystemIcon name="minus-circle" mode="image" size={24} />}
          </BaseNumberField.Decrement>
        )}
        <div
          className={cx(
            unstyled ? undefined : styles.inputWrapper,
            unstyled ? undefined : "title-m-semi",
            classNames?.inputWrapper,
          )}
        >
          <BaseNumberField.Input
            ref={inputRef}
            className={cx(unstyled ? undefined : styles.input, classNames?.input, inputClassName)}
            inputMode={inputMode ?? (safeFractionDigits === 0 ? "numeric" : "decimal")}
            {...restInputProps}
            onBeforeInput={(event) => {
              onInputBeforeInput?.(event);
              if (event.defaultPrevented) return;
              if (!inputTextValidator) return;

              const nativeEvent = event.nativeEvent as InputEvent;
              if (nativeEvent.isComposing) return;
              if (nativeEvent.data === null) return;

              const nextInputValue = getNextInputValue(
                event.currentTarget.value,
                nativeEvent.data,
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );

              if (inputTextValidator(nextInputValue)) return;
              event.preventDefault();
            }}
            onChange={(event) => {
              // Base UI reads the current target after this handler, so normalize the raw text first.
              const normalizedInputValue = removeRedundantLeadingZeros(event.currentTarget.value);
              if (normalizedInputValue === event.currentTarget.value) return;

              replaceInputValuePreservingCaret(event.currentTarget, normalizedInputValue);
            }}
            onKeyDown={(event) => {
              onInputKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (!inputTextValidator) return;
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

              if (inputTextValidator(nextInputValue)) return;
              event.preventDefault();
            }}
            onPaste={(event) => {
              onInputPaste?.(event);
              if (event.defaultPrevented) return;

              const pastedText = event.clipboardData.getData("text");
              const nextInputValue = getNextInputValue(
                event.currentTarget.value,
                pastedText,
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );

              if (inputTextValidator && !inputTextValidator(nextInputValue)) {
                event.preventDefault();
                return;
              }

              const normalizedInputValue = removeRedundantLeadingZeros(nextInputValue);
              if (normalizedInputValue === nextInputValue) return;

              const parsedValue = Number(normalizedInputValue);
              if (!Number.isFinite(parsedValue)) return;

              event.preventDefault();
              onChange(normalizeNumericValue(parsedValue));
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
            {incrementIcon ?? <SystemIcon name="plus-circle" mode="image" size={24} />}
          </BaseNumberField.Increment>
        )}
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}
