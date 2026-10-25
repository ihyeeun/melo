import { Progress } from "@base-ui/react/progress";

import styles from "./Progress.module.css";

export type ProgressVariant = "primary" | "navy";

type ProgressDash = {
  label: string;
  /** value, max와 같은 단위의 기준값. */
  value: number;
};

type ScoreProgressProps = {
  value: number;
  label?: string;
  ariaLabel?: string;
  valueText?: string;
  max?: number;
  dash?: ProgressDash | null;
  variant?: ProgressVariant;
};

export default function ScoreProgress({
  value,
  label,
  ariaLabel,
  valueText,
  max = 100,
  dash = null,
  variant = "primary",
}: ScoreProgressProps) {
  const hasValidMax = Number.isFinite(max) && max > 0;
  const safeMax = hasValidMax ? max : 100;
  const safeValue = hasValidMax && Number.isFinite(value) ? Math.max(0, value) : 0;
  const isExceeded = hasValidMax && safeValue > safeMax;
  const dashPosition =
    dash &&
    hasValidMax &&
    Number.isFinite(dash.value) &&
    dash.value >= 0 &&
    dash.value <= max
      ? (dash.value / max) * 100
      : null;

  return (
    <Progress.Root
      className={styles.Progress}
      data-variant={variant}
      data-exceeded={isExceeded}
      value={safeValue}
      max={safeMax}
      aria-label={ariaLabel}
      getAriaValueText={valueText === undefined ? undefined : () => valueText}
    >
      {label && <Progress.Label className={styles.Label}>{label}</Progress.Label>}
      <div className={styles.TrackWrap} data-has-dash={dashPosition !== null}>
        <Progress.Track className={styles.Track}>
          <Progress.Indicator className={styles.Indicator} />
        </Progress.Track>
        {dash && dashPosition !== null && (
          <span
            className={styles.Dash}
            style={{ left: `${dashPosition}%` }}
            data-align={dashPosition < 10 ? "start" : dashPosition > 90 ? "end" : "center"}
            aria-hidden="true"
          >
            <span className={styles.DashLine} />
            <span className={`${styles.DashLabel} body-s-medium text-secondary`}>{dash.label}</span>
          </span>
        )}
      </div>
    </Progress.Root>
  );
}
