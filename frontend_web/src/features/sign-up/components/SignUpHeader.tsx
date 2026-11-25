import styles from "@/features/sign-up/styles/SignUpHeader.module.css";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type Props = {
  stepIndex: number;
  // 채워지는 칸 수 / 전체 칸 수
  progress: number;
  total: number;
  onBack: () => void;
  // 있으면 오른쪽에 [다른 계정으로 로그인]을 보여 준다
  onSwitchAccount?: () => void;
};

export function SignUpHeader({ stepIndex, progress, total, onBack, onSwitchAccount }: Props) {
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

        {onSwitchAccount ? (
          <button
            type="button"
            className="body-s-medium text-tertiary"
            onClick={onSwitchAccount}
          >
            다른 계정으로 로그인
          </button>
        ) : null}
      </section>

      <section
        className={styles.progress}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={progress}
      >
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={styles.segment} data-filled={index < progress} />
        ))}
      </section>
    </header>
  );
}
