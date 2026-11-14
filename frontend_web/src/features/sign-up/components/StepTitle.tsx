import type { ReactNode } from "react";

import styles from "@/features/sign-up/styles/SignUpSteps.module.css";

type Props = {
  title: string;
  description?: ReactNode;
};

export function StepTitle({ title, description }: Props) {
  return (
    <div className={styles.titleGroup}>
      <h2 className={`${styles.title} title-l-semi text-primary`}>{title}</h2>
      {description ? <p className="body-l-regular text-primary">{description}</p> : null}
    </div>
  );
}
