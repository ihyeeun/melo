import { Progress } from "@base-ui/react/progress";

import styles from "./Progress.module.css";

export type ProgressVariant = "primary-white" | "primary-gray" | "black-gray" | "danger-white";

type ProgressDash = {
  label?: string;
  value: number;
};

type ScoreProgressProps = {
  value: number;
  label?: string;
  max?: number;
  dash?: ProgressDash | null;
  variant?: ProgressVariant;
};

function getPercent(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return null;
  }

  return (value / max) * 100;
}

export default function ScoreProgress({
  value,
  label,
  max = 100,
  dash = null,
  variant = "primary-white",
}: ScoreProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const dashPosition = dash ? getPercent(dash.value, safeMax) : null;
  const visibleDash =
    dash && dashPosition !== null && dashPosition >= 0 && dashPosition <= 100
      ? {
          ...dash,
          position: Math.min(Math.max(dashPosition, 2), 100 - 2),
        }
      : null;

  return (
    <Progress.Root
      className={styles.Progress}
      data-variant={variant}
      value={safeValue}
      max={safeMax}
    >
      {label && <Progress.Label className={styles.Label}>{label}</Progress.Label>}
      <div className={styles.TrackWrap} data-has-dash={visibleDash !== null}>
        <Progress.Track className={styles.Track}>
          <Progress.Indicator className={styles.Indicator} />
        </Progress.Track>
        {visibleDash ? (
          <span
            className={styles.Dash}
            style={{ left: `${visibleDash.position}%` }}
            aria-hidden="true"
          >
            <span className={styles.DashLine} />
            {visibleDash.label ? (
              <span className={`${styles.DashLabel} typo-caption4`}>{visibleDash.label}</span>
            ) : null}
          </span>
        ) : null}
      </div>
    </Progress.Root>
  );
}
