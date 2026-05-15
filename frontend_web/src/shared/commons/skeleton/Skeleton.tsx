import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import styles from "./Skeleton.module.css";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  variant?: "block" | "circle";
  width?: CSSProperties["width"];
};

type SkeletonTextProps = {
  className?: string;
  gap?: CSSProperties["gap"];
  lineHeight?: CSSProperties["height"];
  lines?: number;
  widths?: Array<CSSProperties["width"]>;
};

type SkeletonStatusProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export function Skeleton({
  className,
  height,
  radius,
  style,
  variant = "block",
  width,
  ...props
}: SkeletonProps) {
  const classes = [
    styles.skeleton,
    variant === "circle" ? styles.circle : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      aria-hidden="true"
      className={classes}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export function SkeletonText({
  className,
  gap = 8,
  lineHeight = 14,
  lines = 1,
  widths,
}: SkeletonTextProps) {
  return (
    <div className={[styles.textGroup, className ?? ""].filter(Boolean).join(" ")} style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={widths?.[index] ?? (index === lines - 1 ? "72%" : "100%")}
          height={lineHeight}
          radius={999}
        />
      ))}
    </div>
  );
}

export function SkeletonStatus({
  children,
  className,
  label = "콘텐츠를 불러오는 중입니다.",
}: SkeletonStatusProps) {
  return (
    <div className={className} role="status" aria-live="polite">
      <span className={styles.visuallyHidden}>{label}</span>
      {children}
    </div>
  );
}
