import { useEffect, useState } from "react";

import { Button } from "@/shared/commons/button/Button";

import {
  getInstallUrl,
  isAndroid,
  isAppOpenFallbackVisit,
  isIos,
  openAppWithFallback,
  SETTINGS_FEEDBACK_PATH,
} from "./appOpenLinks";
import styles from "./AppOpenSettingsFeedbackPage.module.css";

type AppOpenSettingsFeedbackPageProps = {
  autoOpen?: boolean;
};

export default function AppOpenSettingsFeedbackPage({
  autoOpen = true,
}: AppOpenSettingsFeedbackPageProps) {
  const [isFallback, setIsFallback] = useState(isAppOpenFallbackVisit);
  const installUrl = getInstallUrl();
  const shouldAutoOpen = autoOpen && (isAndroid() || isIos()) && !isFallback;

  useEffect(() => {
    if (!shouldAutoOpen) return;

    const timer = window.setTimeout(() => {
      openAppWithFallback(SETTINGS_FEEDBACK_PATH, () => setIsFallback(true));
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shouldAutoOpen]);

  return (
    <main className={styles.container}>
      <section className={styles.panel}>
        <img src="/login/melo-logo.svg" className={styles.logo} alt="melo" />
        <div className={styles.copy}>
          <h1 className="typo-title1">
            {isFallback ? "멜로 앱 설치가 필요해요" : "멜로 앱으로 이동"}
          </h1>
          <p className="typo-body2">
            {isFallback
              ? "앱을 설치한 뒤 다시 열면 문의 화면으로 이동해요."
              : "앱을 설치한 뒤 문의 화면을 열 수 있어요."}
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            fullWidth
            size="large"
            onClick={() => openAppWithFallback(SETTINGS_FEEDBACK_PATH, () => setIsFallback(true))}
          >
            앱에서 열기
          </Button>
          {installUrl ? (
            <a className={`${styles.linkButton} typo-body2`} href={installUrl}>
              앱 설치하기
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
