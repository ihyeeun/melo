import styles from "./DataSourceBadge.module.css";

export const DATA_SOURCE_BADGE_VARIANT = {
  PERSONAL: "personal",
  AI_ESTIMATED: "aiEstimated",
} as const;

export type DataSourceBadgeVariant =
  (typeof DATA_SOURCE_BADGE_VARIANT)[keyof typeof DATA_SOURCE_BADGE_VARIANT];

type DataSourceBadgeProps = {
  variant: DataSourceBadgeVariant;
  active?: boolean;
  label?: string;
  className?: string;
};

const BADGE_LABEL: Record<DataSourceBadgeVariant, string> = {
  personal: "개인용",
  aiEstimated: "AI 추정치",
};

const VARIANT_CLASS: Record<DataSourceBadgeVariant, string> = {
  personal: styles.personal,
  aiEstimated: styles["ai-estimated"],
};

export function DataSourceBadge({
  variant,
  active = false,
  label,
  className,
}: DataSourceBadgeProps) {
  const classes = [
    styles.badge,
    VARIANT_CLASS[variant],
    "typo-label6",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} data-active={active ? "true" : undefined}>
      {label ?? BADGE_LABEL[variant]}
    </span>
  );
}
