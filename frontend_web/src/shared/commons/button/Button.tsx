import "./Button.css";

import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

const VARIANT_CLASS = {
  default: "var--default",
  disabled: "var--disabled",
  dismiss: "var--dismiss",
  outlined: "var--outlined",
  text: "var--text",
} as const;

const SIZE_CLASS = {
  m: "size--m body-l-semi",
  s: "size--s body-l-medium",
  xs: "size--xs body-s-medium",
} as const;

const OUTLINE_BORDER_CLASS = {
  primary: "outline-border--primary",
  secondary: "outline-border--secondary",
} as const;

type Variant = keyof typeof VARIANT_CLASS;
type Size = keyof typeof SIZE_CLASS;
type OutlineBorder = keyof typeof OUTLINE_BORDER_CLASS;
type LegacyVariant = "filled";
type LegacySize = "large" | "normal" | "small";
type LegacyInteraction = "normal" | "hover" | "focused" | "pressed" | "disable";

function resolveVariant(variant: Variant | LegacyVariant): Variant {
  return variant === "filled" ? "default" : variant;
}

function resolveSize(size: Size | LegacySize): Size {
  if (size === "large") return "m";
  if (size === "normal") return "s";
  if (size === "small") return "xs";
  return size;
}

type CommonProps = Omit<React.ComponentProps<typeof BaseButton>, "color"> & {
  size?: Size | LegacySize;
  fullWidth?: boolean;
  /** @deprecated Use `border` with the outlined variant. */
  color?: React.CSSProperties["color"];
  /** @deprecated Use the native `disabled` state. Kept while v1 pages migrate. */
  interaction?: LegacyInteraction;
};

type Props = CommonProps & {
  variant?: Variant | LegacyVariant;
  border?: OutlineBorder;
};

export function Button({
  variant = "default",
  border,
  size = "m",
  disabled,
  fullWidth = false,
  color,
  interaction,
  className,
  ...props
}: Props) {
  const resolvedVariant = resolveVariant(variant);
  const resolvedSize = resolveSize(size);
  const isDisabled = disabled || interaction === "disable" || resolvedVariant === "disabled";
  const resolvedBorder = border ?? (color === "normal" ? "secondary" : "primary");
  const classes = [
    "btn",
    VARIANT_CLASS[isDisabled && resolvedVariant !== "text" ? "disabled" : resolvedVariant],
    resolvedVariant === "outlined" ? OUTLINE_BORDER_CLASS[resolvedBorder] : "",
    color === "normal" && "color--normal",
    interaction && interaction !== "normal" && interaction !== "disable"
      ? `interaction--${interaction}`
      : "",
    SIZE_CLASS[resolvedSize],
    fullWidth && "btn--full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <BaseButton {...props} disabled={isDisabled} type={props.type ?? "button"} className={classes} />
  );
}
