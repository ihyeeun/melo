import type { ComponentPropsWithoutRef, CSSProperties } from "react";

import styles from "./SystemIcon.module.css";

const SYSTEM_ICON_SRC = {
  "arrow-insert": "/icons/system-icons/arrow-insert.svg",
  camera: "/icons/system-icons/camera.svg",
  check: "/icons/system-icons/check.svg",
  "chevron-down": "/icons/system-icons/chevron-down.svg",
  "chevron-left": "/icons/system-icons/chevron-left.svg",
  "chevron-right": "/icons/system-icons/chevron-right.svg",
  "chevron-up": "/icons/system-icons/chevron-up.svg",
  copy: "/icons/system-icons/copy.svg",
  edit: "/icons/system-icons/edit.svg",
  delete: "/icons/system-icons/delete.svg",
  drag: "/icons/system-icons/drag.svg",
  exit: "/icons/system-icons/exit.svg",
  fitness: "/icons/system-icons/fitness.svg",
  info: "/icons/system-icons/info.svg",
  kebab: "/icons/system-icons/kebab.svg",
  breakfast: "/icons/system-icons/light-mode.svg",
  lunch: "/icons/system-icons/lunch-dining.svg",
  dinner: "/icons/system-icons/local-bar.svg",
  snack: "/icons/system-icons/coffee.svg",
  "late-snack": "/icons/system-icons/brightness.svg",
  "minus-circle": "/icons/system-icons/minus-circle.svg",
  minus: "/icons/system-icons/minus.svg",
  "more-horiz": "/icons/system-icons/more-horiz.svg",
  notification: "/icons/system-icons/notification.svg",
  "plus-circle": "/icons/system-icons/plus-circle.svg",
  plus: "/icons/system-icons/plus.svg",
  search: "/icons/system-icons/search.svg",
  settings: "/icons/system-icons/settings.svg",
  walking: "/icons/system-icons/walking.svg",
  "arrow-filled-right": "/icons/system-icons/arrow-filled-right.svg",
  "arrow-filled-left": "/icons/system-icons/arrow-filled-left.svg",
  "contract-edit": "/icons/system-icons/contract-edit.svg",
  "photo-library": "/icons/system-icons/photo-library.svg",
} as const;

export type SystemIconName = keyof typeof SYSTEM_ICON_SRC;

type SystemIconProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  name: SystemIconName;
  mode?: "mask" | "image";
  size?: number | string;
};

type SystemIconStyle = CSSProperties & {
  "--system-icon-size": string;
  "--system-icon-url"?: string;
};

function toCssSize(size: number | string) {
  return typeof size === "number" ? `${size}px` : size;
}

export function SystemIcon({
  name,
  mode = "mask",
  size = 24,
  className,
  style,
  "aria-hidden": ariaHidden = true,
  ...props
}: SystemIconProps) {
  const src = SYSTEM_ICON_SRC[name];
  const iconStyle: SystemIconStyle = {
    ...style,
    "--system-icon-size": toCssSize(size),
  };

  if (mode === "mask") {
    iconStyle["--system-icon-url"] = `url("${src}")`;
  }

  const classes = [styles.icon, mode === "mask" ? styles.mask : styles.image, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      {...props}
      className={classes}
      style={iconStyle}
      aria-hidden={ariaHidden}
      data-system-icon="true"
    >
      {mode === "image" ? <img src={src} alt="" className={styles.imageElement} /> : null}
    </span>
  );
}
