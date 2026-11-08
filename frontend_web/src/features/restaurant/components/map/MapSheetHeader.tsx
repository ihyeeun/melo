import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type MapSheetHeaderProps = {
  title: string;
  onBack: () => void;
};

export default function MapSheetHeader({ title, onBack }: MapSheetHeaderProps) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.backButton} aria-label="뒤로 가기" onClick={onBack}>
        <SystemIcon name="chevron-left" size={24} />
      </button>
      <h2 className={`title-s-semi text-primary ${styles.title}`}>{title}</h2>
    </header>
  );
}
