import "./Button.css";

import { Button as BaseButton } from "@base-ui/react/button";

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

type CommonProps = Omit<React.ComponentProps<typeof BaseButton>, "color"> & {
  size?: Size;
  fullWidth?: boolean;
};

type Props = CommonProps &
  (
    | {
        variant: "outlined";
        border?: OutlineBorder;
      }
    | {
        variant?: Exclude<Variant, "outlined">;
        border?: never;
      }
  );

export function Button({
  variant = "default",
  border,
  size = "m",
  disabled,
  fullWidth = false,
  className,
  ...props
}: Props) {
  const isDisabled = disabled || variant === "disabled";
  const classes = [
    "btn",
    VARIANT_CLASS[isDisabled && variant !== "text" ? "disabled" : variant],
    variant === "outlined" ? OUTLINE_BORDER_CLASS[border ?? "primary"] : "",
    SIZE_CLASS[size],
    fullWidth && "btn--full",
    className,
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
