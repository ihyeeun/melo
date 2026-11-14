import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";

type Props = {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
};

export function OptionCard({ title, description, selected, onSelect }: Props) {
  return (
    <SelectedCard isSelected={selected} setSelectedChange={onSelect} className={styles.optionCard}>
      <p className={`${styles.optionTitle} body-l-medium text-primary`}>{title}</p>
      {description ? <p className="body-s-regular text-secondary">{description}</p> : null}
    </SelectedCard>
  );
}
