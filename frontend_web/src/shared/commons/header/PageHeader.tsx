import type { ReactNode } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./PageHeader.module.css";

type Props = {
  title?: string;
  onBack?: () => void;
  backButtonAriaLabel?: string;
  showStatusBar?: boolean;
  timeText?: string;
  rightSlot?: ReactNode;
  showDivider?: boolean;
  safeAreaTop?: boolean;
  className?: string;
};

export function PageHeader({
  title,
  onBack,
  backButtonAriaLabel = "뒤로가기",
  rightSlot,
  safeAreaTop = true,
  className,
}: Props) {
  const classes = [styles.root, safeAreaTop ? styles.safeAreaTop : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className={styles.navBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          disabled={!onBack}
          aria-label={backButtonAriaLabel}
        >
          <SystemIcon name="chevron-left-normal" size={24} />
        </button>
        <h1 className={`${styles.title} typo-title3`}>{title}</h1>
        <div className={styles.rightSlot}>{rightSlot}</div>
      </div>
    </header>
  );
}
