import type { ReactNode } from "react";

import { StepTitle } from "@/features/sign-up/components/StepTitle";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { Button } from "@/shared/commons/button/Button";

type Props = {
  title: string;
  description?: ReactNode;
  canGoNext: boolean;
  onNext: () => void;
  nextLabel: string;
  children: ReactNode;
};

export function StepLayout({
  title,
  description,
  canGoNext,
  onNext,
  nextLabel,
  children,
}: Props) {
  return (
    <>
      <main className={`main ${styles.content}`}>
        <StepTitle title={title} description={description} />
        {children}
      </main>

      <footer className="footer">
        <Button onClick={onNext} disabled={!canGoNext} fullWidth size="m">
          {nextLabel}
        </Button>
      </footer>
    </>
  );
}
