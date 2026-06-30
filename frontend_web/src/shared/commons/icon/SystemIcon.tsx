import type { ComponentPropsWithoutRef, CSSProperties } from "react";

import styles from "./SystemIcon.module.css";

const SYSTEM_ICON_SRC = {
  camera: "/icons/system-icons/camera.svg",
  check: "/icons/system-icons/check.svg",
  "chevron-down-normal": "/icons/system-icons/chevron-down-normal.svg",
  "chevron-down-thin": "/icons/system-icons/chevron-down-thin.svg",
  "chevron-left-normal": "/icons/system-icons/chevron-left-normal.svg",
  "chevron-left-thin": "/icons/system-icons/chevron-left-thin.svg",
  "chevron-right-normal": "/icons/system-icons/chevron-right-normal.svg",
  "chevron-right-thin": "/icons/system-icons/chevron-right-thin.svg",
  "chevron-up-normal": "/icons/system-icons/chevron-up-normal.svg",
  "chevron-up-thin": "/icons/system-icons/chevron-up-thin.svg",
  "circle-check": "/icons/system-icons/circle-check.svg",
  "circle-check-selected": "/icons/system-icons/circle-check-selected.svg",
  "circle-close": "/icons/system-icons/circle-close.svg",
  "circle-info": "/icons/system-icons/circle-info.svg",
  "circle-info-color": "/icons/system-icons/circle-info-color.svg",
  "circle-minus-large": "/icons/system-icons/circle-minus-large.svg",
  "circle-minus": "/icons/system-icons/circle-minus.svg",
  "circle-plus-large": "/icons/system-icons/circle-plus-large.svg",
  "circle-plus": "/icons/system-icons/circle-plus.svg",
  "circle-plus-fill": "/icons/system-icons/circle-plus-fill.svg",
  "close-large": "/icons/system-icons/close-large.svg",
  close: "/icons/system-icons/close.svg",
  "info-icon": "/icons/system-icons/info-icon.svg",
  pencil: "/icons/system-icons/pencil.svg",
  "pencil-fill": "/icons/system-icons/pencil-fill.svg",
  plus: "/icons/system-icons/plus.svg",
  minus: "/icons/system-icons/minus.svg",
  search: "/icons/system-icons/search.svg",
  setting: "/icons/system-icons/setting.svg",
  trash: "/icons/system-icons/trash.svg",
  backup: "/icons/system-icons/backup.svg",
  fire: "/icons/system-icons/fire.svg",
  walking: "/icons/system-icons/walking.svg",
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
