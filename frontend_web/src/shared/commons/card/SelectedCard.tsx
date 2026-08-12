import styles from "./SelectedCard.module.css";

type SelectedCardProps = {
  isSelected: boolean;
  setSelectedChange: (isSelected: boolean) => void;
  children: React.ReactNode;
};

/**
 * isSelected: boolean;
 * setSelectedChange: ()=>{};
 */
export function SelectedCard({ isSelected, setSelectedChange, children }: SelectedCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={styles.card}
      data-selected={isSelected}
      onClick={() => setSelectedChange(!isSelected)}
    >
      {children}
    </button>
  );
}
