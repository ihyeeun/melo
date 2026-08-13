import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./FloatingCameraButton.module.css";

type FloatingCameraButtonProps = {
  onClick: () => void;
  ariaLabel: string;
  tone?: "primary" | "light";
  bottomOffset?: number;
} & Omit<React.ComponentPropsWithoutRef<"button">, "children" | "onClick" | "aria-label">;

export function FloatingCameraButton({
  onClick,
  ariaLabel,
  tone = "primary",
  bottomOffset = 70,
  type,
  className,
  style,
  ...props
}: FloatingCameraButtonProps) {
  const classes = [styles.button, tone === "primary" ? styles.primary : styles.light, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type ?? "button"}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        ...style,
        bottom: `${bottomOffset}px`,
      }}
    >
      <SystemIcon name="camera" size={28} />
    </button>
  );
}
