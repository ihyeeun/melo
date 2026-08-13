import { Progress } from "@base-ui/react/progress";

import styles from "./Progress.module.css";

export type ProgressVariant = "primary" | "navy";

type ScoreProgressProps = {
  value: number;
  label?: string;
  max?: number;
  variant?: ProgressVariant;
};

export default function ScoreProgress({
  value,
  label,
  max = 100,
  variant = "primary",
}: ScoreProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <Progress.Root
      className={styles.Progress}
      data-variant={variant}
      value={safeValue}
      max={safeMax}
    >
      {label && <Progress.Label className={styles.Label}>{label}</Progress.Label>}
      <div className={styles.TrackWrap}>
        <Progress.Track className={styles.Track}>
          <Progress.Indicator className={styles.Indicator} />
        </Progress.Track>
      </div>
    </Progress.Root>
  );
}
