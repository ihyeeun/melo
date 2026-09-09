import type { ReactNode } from "react";
import { useId } from "react";

import styles from "./ArcProgress.module.css";

const VIEWBOX_WIDTH = 220;
const VIEWBOX_HEIGHT = 100;
const RADIUS = 75;
const CENTER_X = 110;
const CENTER_Y = 95;
const START_ANGLE = 170;
const END_ANGLE = 10;
const GRADIENT_SEGMENT_COUNT = 32;

function getArcPoint(angle: number, radius = RADIUS) {
  const radian = (angle * Math.PI) / 180;

  return {
    x: CENTER_X + radius * Math.cos(radian),
    y: CENTER_Y - radius * Math.sin(radian),
  };
}

// 채팅에서 사용하던 160도 호: 둥근 양 끝까지 viewBox 안에 들어오도록 여백을 둔다.
const start = getArcPoint(START_ANGLE);
const end = getArcPoint(END_ANGLE);
const ARC_PATH = `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;

// SVG에는 각도형 그라데이션이 없어 짧은 선형 그라데이션들을 호 방향으로 연결한다.
// 전체 호의 마스크가 외곽과 둥근 끝을 결정하며, 조각은 조금 겹쳐 경계의 틈을 없앤다.
const GRADIENT_SEGMENTS = Array.from({ length: GRADIENT_SEGMENT_COUNT }, (_, index) => {
  const step = (START_ANGLE - END_ANGLE) / GRADIENT_SEGMENT_COUNT;
  const startAngle = START_ANGLE - step * index;
  const endAngle = startAngle - step;
  const segmentStart = getArcPoint(startAngle);
  const segmentEnd = getArcPoint(endAngle);
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  // 첫/마지막 조각은 둥근 끝 너머까지 덮고, 나머지는 0.1도씩 겹친다.
  const outerStart = getArcPoint(startAngle + (index === 0 ? 20 : 0.1), VIEWBOX_WIDTH);
  const outerEnd = getArcPoint(
    endAngle - (index === GRADIENT_SEGMENT_COUNT - 1 ? 20 : 0.1),
    VIEWBOX_WIDTH,
  );

  return {
    // 각 조각에서도 전체 호의 색상 비율이 이어지도록 그라데이션 축을 확장한다.
    x1: segmentStart.x - dx * index,
    y1: segmentStart.y - dy * index,
    x2: segmentStart.x + dx * (GRADIENT_SEGMENT_COUNT - index),
    y2: segmentStart.y + dy * (GRADIENT_SEGMENT_COUNT - index),
    path: `M ${CENTER_X} ${CENTER_Y} L ${outerStart.x} ${outerStart.y} A ${VIEWBOX_WIDTH} ${VIEWBOX_WIDTH} 0 0 1 ${outerEnd.x} ${outerEnd.y} Z`,
  };
});

export type ArcProgressProps = {
  value: number;
  max?: number;
  ariaLabel: string;
  valueText?: string;
  color?: string;
  /** 전체 호의 시작부터 끝까지 적용할 각도형 그라데이션. */
  gradient?: { startColor: string; endColor: string };
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
  gradient,
  trackColor = "var(--background-gray-1)",
  className,
  children,
}: ArcProgressProps) {
  const maskId = `arc-progress-${useId()}`;
  const hasValidMax = Number.isFinite(max) && max > 0;
  const safeMax = hasValidMax ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const boundedValue = hasValidMax ? Math.min(Math.max(safeValue, 0), safeMax) : 0;
  const percent = (boundedValue / safeMax) * 100;
  const valuePath = (
    <path
      className={styles.value}
      d={ARC_PATH}
      pathLength={100}
      stroke={gradient ? "white" : color}
      strokeDasharray="100 100"
      strokeDashoffset={100 - percent}
      // 길이가 0이어도 round linecap이 점으로 보일 수 있어 빈 게이지는 숨긴다.
      opacity={percent > 0 ? 1 : 0}
    />
  );

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
        {gradient && (
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
            >
              {valuePath}
            </mask>
            {GRADIENT_SEGMENTS.map(({ x1, y1, x2, y2 }, index) => (
              <linearGradient
                key={index}
                id={`${maskId}-gradient-${index}`}
                gradientUnits="userSpaceOnUse"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              >
                <stop offset={0} stopColor={gradient.startColor} />
                <stop offset={1} stopColor={gradient.endColor} />
              </linearGradient>
            ))}
          </defs>
        )}
        <path className={styles.track} d={ARC_PATH} pathLength={100} stroke={trackColor} />
        {gradient ? (
          <g mask={`url(#${maskId})`}>
            {GRADIENT_SEGMENTS.map(({ path }, index) => (
              <path key={index} d={path} fill={`url(#${maskId}-gradient-${index})`} />
            ))}
          </g>
        ) : (
          valuePath
        )}
      </svg>
      {children}
    </div>
  );
}
