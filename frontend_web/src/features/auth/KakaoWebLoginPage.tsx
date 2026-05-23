import { getApiBaseUrl, redirectToKakaoWebLogin } from "@/features/auth/api/kakaoWebAuth";
import { Button } from "@/shared/commons/button/Button";

import styles from "./AuthRedirectPage.module.css";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "카카오 로그인을 시작하지 못했습니다.";
}

export default function KakaoWebLoginPage() {
  let errorMessage = "";

  try {
    getApiBaseUrl();
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  const startKakaoLogin = () => {
    try {
      redirectToKakaoWebLogin();
    } catch (error) {
      console.error(getErrorMessage(error));
    }
  };

  if (errorMessage) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>카카오 로그인 실패</h1>
        <p className={styles.description}>{errorMessage}</p>
        <div className={styles.actions}>
          <Button className={styles.actionButton} onClick={startKakaoLogin}>
            다시 시도
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.loginContainer}>
      <div className={styles.phoneFrame}>
        <div className={styles.loginWrapper}>
          <img src="/login/login-logo.svg" alt="logo" height={70} />

          <img src="/login/login-image.svg" alt="logo" />

          <section className={styles.loginActions}>
            <button
              className={`${styles.kakaoButton} typo-label3`}
              type="button"
              onClick={startKakaoLogin}
            >
              <img src="/login/kakao-logo.svg" alt="kakao-logo" width={20} />
              카카오로 계속하기
            </button>
            <p className={`${styles.loginFooter} typo-body3`}>
              가입하면 Melo의 <br />
              <a
                href="https://third-princess-d57.notion.site/privacypolicy"
                rel="noreferrer"
                target="_blank"
                className={styles.link}
              >
                이용약관 및 개인정보 처리방침
              </a>
              에 동의하게 됩니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
