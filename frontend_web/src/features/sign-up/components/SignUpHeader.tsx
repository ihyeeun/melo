import styles from "@/features/sign-up/styles/SignUpHeader.module.css";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type Props = {
  stepIndex: number;
  total: number;
  onBack: () => void;
};

export function SignUpHeader({ stepIndex, total, onBack }: Props) {
  return (
    <header className={styles.header}>
      <section className={styles.backButtonSection}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          disabled={stepIndex === 0}
          aria-label="이전 단계"
        >
          <SystemIcon name="chevron-left" size={24} className={`text-secondary`} />
        </button>
      </section>

      <section
        className={styles.progress}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={stepIndex + 1}
      >
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={styles.segment} data-filled={index <= stepIndex} />
        ))}
      </section>
    </header>
  );
}
