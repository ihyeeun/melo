import styles from "@/features/calendar/styles/EventDot.module.css";
import type { ViewMode } from "@/features/calendar/types/calendar.types";

type Props = {
  visible: boolean;
  variant: ViewMode;
  isOutside: boolean;
};

export default function EventDot({ visible, variant, isOutside }: Props) {
  return (
    <div
      className={styles.root}
      data-view={variant}
      data-outside={isOutside}
      data-visible={visible}
      aria-hidden="true"
    >
      {visible && <span className={styles.dot} />}
    </div>
  );
}
