import * as React from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./FloatingCameraButton.module.css";

const INTERACTION_CLASS = {
  normal: "",
  hover: "interactionHover",
  focused: "interactionFocused",
  pressed: "interactionPressed",
  disable: "interactionDisable",
} as const;

type Interaction = keyof typeof INTERACTION_CLASS;

type FloatingCameraButtonProps = {
  onClick: () => void;
  ariaLabel: string;
  tone?: "primary" | "light";
  interaction?: Interaction;
  bottomOffset?: number;
} & Omit<React.ComponentPropsWithoutRef<"button">, "children" | "onClick" | "aria-label">;

export function FloatingCameraButton({
  onClick,
  ariaLabel,
  tone = "primary",
  interaction,
  bottomOffset = 70,
  disabled,
  type,
  className,
  style,
  ...props
}: FloatingCameraButtonProps) {
  const resolvedInteraction = interaction ?? (disabled ? "disable" : "normal");
  const isDisabled = disabled || resolvedInteraction === "disable";

  const classes = [
    styles.button,
    tone === "primary" ? styles.primary : styles.light,
    resolvedInteraction ? styles[INTERACTION_CLASS[resolvedInteraction]] : "",
    interaction ? styles.interactionForced : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type ?? "button"}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={isDisabled}
      style={{
        ...style,
        bottom: `calc(var(--safe-area-bottom) + ${bottomOffset}px)`,
      }}
    >
      <SystemIcon name="camera" size={24} />
    </button>
  );
}
