import { Button } from "@/shared/commons/button/Button";

import styles from "./AuthRedirectPage.module.css";

const APP_SCHEME_URL = "melo://";
const ANDROID_PACKAGE_NAME = "com.melo.frontend";
const DEFAULT_ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
const APP_OPEN_FALLBACK_DELAY_MS = 1400;

function isIos() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

function isAndroid() {
  return /Android/.test(window.navigator.userAgent);
}

function getInstallUrl(): string | null {
  const iosStoreUrl = import.meta.env.VITE_IOS_APP_STORE_URL;
  const androidStoreUrl = import.meta.env.VITE_ANDROID_PLAY_STORE_URL || DEFAULT_ANDROID_STORE_URL;
  const commonDownloadUrl = import.meta.env.VITE_APP_DOWNLOAD_URL;

  if (isIos()) return iosStoreUrl || commonDownloadUrl || null;
  if (isAndroid()) return androidStoreUrl || commonDownloadUrl || window.location.origin;

  return commonDownloadUrl || iosStoreUrl || androidStoreUrl || null;
}

function getAppOpenUrl(installUrl: string | null) {
  if (!isAndroid() || installUrl === null) return APP_SCHEME_URL;

  return [
    "intent://open",
    "#Intent",
    `scheme=${APP_SCHEME_URL.replace("://", "")}`,
    `package=${ANDROID_PACKAGE_NAME}`,
    `S.browser_fallback_url=${encodeURIComponent(installUrl)}`,
    "end",
  ].join(";");
}

function openAppOrInstall() {
  const installUrl = getInstallUrl();
  const appOpenUrl = getAppOpenUrl(installUrl);

  const fallbackTimer =
    installUrl === null
      ? null
      : window.setTimeout(() => {
          if (!document.hidden) {
            window.location.assign(installUrl);
          }
        }, APP_OPEN_FALLBACK_DELAY_MS);

  const clearFallback = () => {
    if (document.hidden && fallbackTimer !== null) {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", clearFallback);
    }
  };

  document.addEventListener("visibilitychange", clearFallback);
  window.location.assign(appOpenUrl);
}

function openInstallPage(installUrl: string) {
  window.location.assign(installUrl);
}

export default function AppInfoPage() {
  const installUrl = getInstallUrl();

  return (
    <main className={styles.loginContainer}>
      <div className={styles.phoneFrame}>
        <div className={styles.loginWrapper}>
          <section className={styles.imageSection}>
            <img src="/login/login-logo.svg" height={70} alt="" aria-hidden="true" />
            <img
              src="/login/login-image.png"
              className={styles.loginImage}
              alt=""
              aria-hidden="true"
            />
          </section>

          <section className={styles.loginActions}>
            <div className={styles.completeCopy}>
              <p className={styles.completeTitle}>회원가입이 완료됐어요</p>
              <p className={styles.completeDescription}>멜로에서 만나요!</p>
            </div>
            <Button fullWidth onClick={openAppOrInstall}>
              앱에서 계속하기
            </Button>
            {installUrl !== null ? (
              <button
                className={styles.storeLinkButton}
                type="button"
                onClick={() => openInstallPage(installUrl)}
              >
                앱이 안 열리나요? 스토어에서 설치하기
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
