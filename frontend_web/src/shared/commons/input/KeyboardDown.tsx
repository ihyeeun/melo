import type { ButtonHTMLAttributes, PointerEventHandler } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./KeyboardDown.module.css";

type KeyboardDownProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onPointerDown" | "type"
>;

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function dismissKeyboard() {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

const handlePointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
  // Prevent focus from moving to the button before the current input blurs.
  event.preventDefault();
  dismissKeyboard();
};

export function KeyboardDown({
  "aria-label": ariaLabel = "키보드 닫기",
  className,
  onClick,
  ...props
}: KeyboardDownProps) {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={cx(styles.button, styles["visible-on-input-focus"], className)}
      type="button"
      onPointerDown={handlePointerDown}
      onClick={onClick}
    >
      <SystemIcon name="chevron-down-thin" size={24} />
    </button>
  );
}
