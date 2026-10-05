import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";

type OnboardingOptionCardProps = {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
};

export default function OnboardingOptionCard({
  selected,
  onClick,
  title,
  description,
}: OnboardingOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.onboardingOptionCard, selected ? styles.onboardingOptionCardActive : ""]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
    >
      <div className={styles.onboardingOptionCardContent}>
        <p className={`${styles.textNormal} title-s-semi`}>{title}</p>
        {description ? (
          <p className={`${styles.textAlternative} body-l-medium`}>{description}</p>
        ) : null}
      </div>
    </button>
  );
}
