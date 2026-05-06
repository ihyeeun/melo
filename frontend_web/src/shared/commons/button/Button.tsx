import "./Button.css";

import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

const MODERN_VARIANT_CLASS = {
  filled: "btn--variant-filled",
  outlined: "btn--variant-outlined",
  text: "btn--variant-text",
} as const;

const COLOR_CLASS = {
  primary: "btn--color-primary",
  normal: "btn--color-normal",
} as const;

const SIZE_CLASS = {
  small: "btn--size-small",
  normal: "btn--size-normal",
  large: "btn--size-large",
} as const;

const INTERACTION_CLASS = {
  normal: "btn--state-default",
  hover: "btn--state-hover",
  focused: "btn--state-focused",
  pressed: "btn--state-pressed",
  disable: "btn--state-disabled",
} as const;

type Variant = keyof typeof MODERN_VARIANT_CLASS;
type Color = keyof typeof COLOR_CLASS;
type Size = keyof typeof SIZE_CLASS;
type Interaction = keyof typeof INTERACTION_CLASS;

type Props = React.ComponentProps<typeof BaseButton> & {
  variant?: Variant;
  color?: Color;
  size?: Size;
  interaction?: Interaction;
  fullWidth?: boolean;
};

export function Button({
  variant = "filled",
  color,
  size = "normal",
  interaction,
  disabled,
  fullWidth = false,
  className,
  ...props
}: Props) {
  const resolvedInteraction = interaction ?? (disabled ? "disable" : "normal");
  const isDisabled = disabled || resolvedInteraction === "disable";

  const classes = [
    "btn",
    MODERN_VARIANT_CLASS[variant],
    COLOR_CLASS[color ?? "primary"],
    SIZE_CLASS[size],
    INTERACTION_CLASS[isDisabled ? "disable" : resolvedInteraction],
    resolvedInteraction === "focused" && "btn--interaction-focused",
    fullWidth && "btn--full",
    typeof className === "string" ? className : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <BaseButton
      {...props}
      disabled={isDisabled}
      type={props.type ?? "button"}
      className={classes}
    />
  );
}
