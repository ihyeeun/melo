const DISALLOWED_INPUT_CHARACTERS =
  /[^\p{Script=Hangul}a-zA-Z0-9 !@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]/gu;

const UNSUPPORTED_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "file",
  "hidden",
  "image",
  "month",
  "radio",
  "range",
  "reset",
  "submit",
  "time",
  "week",
]);

const sanitizeInputValue = (value: string) => value.replace(DISALLOWED_INPUT_CHARACTERS, "");

const isSanitizableInput = (target: EventTarget | null): target is HTMLInputElement => {
  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  if (target.readOnly || target.disabled) {
    return false;
  }

  return !UNSUPPORTED_INPUT_TYPES.has(target.type);
};

const updateInputCursor = (input: HTMLInputElement, rawValueBeforeCursor: string) => {
  const nextCursorPosition = sanitizeInputValue(rawValueBeforeCursor).length;

  try {
    input.setSelectionRange(nextCursorPosition, nextCursorPosition);
  } catch {
    // Some input types do not support setSelectionRange.
  }
};

const isComposingInputEvent = (event: Event) => (event as InputEvent).isComposing === true;

export const initInputCharacterRestriction = () => {
  const handleInput = (event: Event) => {
    if (!isSanitizableInput(event.target)) {
      return;
    }

    if (isComposingInputEvent(event)) {
      return;
    }

    const rawValue = event.target.value;
    const sanitizedValue = sanitizeInputValue(rawValue);

    if (rawValue === sanitizedValue) {
      return;
    }

    const cursorPosition = event.target.selectionStart;
    const rawValueBeforeCursor =
      cursorPosition === null ? rawValue : rawValue.slice(0, cursorPosition);

    event.target.value = sanitizedValue;
    updateInputCursor(event.target, rawValueBeforeCursor);
  };

  document.addEventListener("input", handleInput, true);

  return () => {
    document.removeEventListener("input", handleInput, true);
  };
};
