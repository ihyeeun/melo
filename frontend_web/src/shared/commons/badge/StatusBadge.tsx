import type { NutrientGrade } from "@/shared/utils/nutrientScore";

import styles from "./StatusBadge.module.css";
import { getNutrientStatusByPercent } from "./StatusBadge.utils";

export type NutrientStatus = NutrientGrade;

const STATUS_LABEL: Record<NutrientStatus, string> = {
  appropriate: "적절",
  slightlyUnbalanced: "보통",
  unbalanced: "약간 불균형",
  severelyUnbalanced: "불균형",
};

const DOT_CLASS: Record<NutrientStatus, string> = {
  appropriate: styles.appropriate,
  slightlyUnbalanced: styles.slightlyUnbalanced,
  unbalanced: styles.unbalanced,
  severelyUnbalanced: styles.severelyUnbalanced,
};

type StatusBadgeProps = {
  status?: NutrientStatus;
  percent?: number;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, percent, label, className }: StatusBadgeProps) {
  const resolvedStatus = status ?? getNutrientStatusByPercent(percent ?? 0);
  const classes = [styles.badge, className ?? ""].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <span className={`${styles.dot} ${DOT_CLASS[resolvedStatus]}`} aria-hidden="true" />
      <span className={`${styles.label} body-s-medium`}>{label ?? STATUS_LABEL[resolvedStatus]}</span>
    </span>
  );
}
