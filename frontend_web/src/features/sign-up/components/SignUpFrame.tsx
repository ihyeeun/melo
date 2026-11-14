import type { ReactNode } from "react";

import styles from "@/features/sign-up/styles/SignUpFrame.module.css";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";

type Props = {
  children: ReactNode;
};

// 웹에서는 넓은 화면 가운데에 휴대폰 크기로 띄운다
export function SignUpFrame({ children }: Props) {
  if (isNativeApp()) {
    return <div className={`page ${styles.root}`}>{children}</div>;
  }

  return (
    <div className={`page ${styles.webFrameBackground}`}>
      <div className={styles.phoneFrame}>{children}</div>
    </div>
  );
}
