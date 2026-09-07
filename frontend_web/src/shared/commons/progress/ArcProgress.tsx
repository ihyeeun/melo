import type { ReactNode } from "react";

import styles from "./ArcProgress.module.css";

const VIEWBOX_WIDTH = 220;
const VIEWBOX_HEIGHT = 100;
const RADIUS = 75;

function getArcPoint(angle: number) {
  const radian = (angle * Math.PI) / 180;

  return {
    x: 110 + RADIUS * Math.cos(radian),
    y: 95 - RADIUS * Math.sin(radian),
  };
}

// 채팅에서 사용하던 160도 호: 둥근 양 끝까지 viewBox 안에 들어오도록 여백을 둔다.
const start = getArcPoint(170);
const end = getArcPoint(10);
const ARC_PATH = `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;

export type ArcProgressProps = {
  value: number;
  max?: number;
  ariaLabel: string;
  valueText?: string;
  color?: string;
  trackColor?: string;
  className?: string;
  /** 게이지 안에 표시할 캐릭터나 문구. 위치는 사용하는 화면에서 지정한다. */
  children?: ReactNode;
};

export default function ArcProgress({
  value,
  max = 100,
  ariaLabel,
  valueText,
  color = "var(--primary-normal)",
  trackColor = "var(--background-gray-1)",
  className,
  children,
}: ArcProgressProps) {
  const hasValidMax = Number.isFinite(max) && max > 0;
  const safeMax = hasValidMax ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const boundedValue = hasValidMax ? Math.min(Math.max(safeValue, 0), safeMax) : 0;
  const percent = (boundedValue / safeMax) * 100;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={boundedValue}
      aria-valuetext={valueText ?? (hasValidMax ? `${Math.round(percent)}%` : "기준값 없음")}
    >
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        aria-hidden="true"
        focusable="false"
      >
        <path className={styles.track} d={ARC_PATH} pathLength={100} stroke={trackColor} />
        <path
          className={styles.value}
          d={ARC_PATH}
          pathLength={100}
          stroke={color}
          strokeDasharray="100 100"
          strokeDashoffset={100 - percent}
          // 길이가 0이어도 round linecap이 점으로 보일 수 있어 빈 게이지는 숨긴다.
          opacity={percent > 0 ? 1 : 0}
        />
      </svg>
      {children}
    </div>
  );
}
