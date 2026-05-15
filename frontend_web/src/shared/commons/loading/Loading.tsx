import type { CSSProperties, HTMLAttributes } from "react";

import styles from "./Loading.module.css";

const LOADING_ICONS = [
  "/icons/loading-1.svg",
  "/icons/loading-2.svg",
  "/icons/loading-3.svg",
] as const;

type LoadingStyle = CSSProperties & {
  "--loading-icon-size"?: string;
  "--loading-screen-background"?: CSSProperties["background"];
};

type LoadingIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  iconSize?: CSSProperties["width"];
  label?: string;
};

type LoadingScreenProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  background?: CSSProperties["background"];
  iconSize?: CSSProperties["width"];
  label?: string;
};

function toCssSize(size: CSSProperties["width"]) {
  return typeof size === "number" ? `${size}px` : size;
}

function getClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function LoadingIndicator({
  className,
  iconSize = 34,
  label = "로딩 중입니다.",
  style,
  ...props
}: LoadingIndicatorProps) {
  return (
    <div
      {...props}
      aria-live="polite"
      className={getClasses(styles.indicator, className)}
      role="status"
      style={
        {
          "--loading-icon-size": toCssSize(iconSize),
          ...style,
        } as LoadingStyle
      }
    >
      <span className={styles.visuallyHidden}>{label}</span>
      <div aria-hidden="true" className={styles.iconGroup}>
        {LOADING_ICONS.map((src) => (
          <img key={src} alt="" className={styles.icon} src={src} />
        ))}
      </div>
    </div>
  );
}

export function LoadingScreen({
  background,
  className,
  iconSize,
  label,
  style,
  ...props
}: LoadingScreenProps) {
  return (
    <main
      {...props}
      className={getClasses(styles.screen, className)}
      style={
        {
          ...(background ? { "--loading-screen-background": background } : {}),
          ...style,
        } as LoadingStyle
      }
    >
      <LoadingIndicator iconSize={iconSize} label={label} />
    </main>
  );
}
