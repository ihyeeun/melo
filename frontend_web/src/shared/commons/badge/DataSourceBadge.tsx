import styles from "./DataSourceBadge.module.css";

export const DATA_SOURCE_BADGE_VARIANT = {
  PERSONAL: "personal",
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
};

const VARIANT_CLASS: Record<DataSourceBadgeVariant, string> = {
  personal: styles.personal,
};

export function DataSourceBadge({
  variant,
  active = false,
  label,
  className,
}: DataSourceBadgeProps) {
  const classes = [styles.badge, VARIANT_CLASS[variant], "caption-m-medium", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} data-active={active}>
      {label ?? BADGE_LABEL[variant]}
    </span>
  );
}
