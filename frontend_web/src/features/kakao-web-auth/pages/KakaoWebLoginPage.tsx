import { redirectToKakaoWebLogin } from "@/features/kakao-web-auth/api/kakaoWebAuth";
import styles from "@/features/kakao-web-auth/styles/AppInfo.module.css";
import { TERMS_AND_PRIVACY_POLICY_URL } from "@/shared/config/externalLinks";

export default function KakaoWebLoginPage() {
  return (
    <main className={styles.loginContainer}>
      <div className={styles.phoneFrame}>
        <div className={styles.loginWrapper}>
          <section className={styles.imageSection}>
            <img src="/login/melo-logo-black.png" alt="melo" height={70} />

            <img src="/login/login-image.png" alt="" aria-hidden="true" className={styles.loginImage} />
          </section>

          <section className={styles.loginActions}>
            <button
              className={`${styles.kakaoButton} body-m-regular`}
              type="button"
              onClick={redirectToKakaoWebLogin}
            >
              <img src="/login/kakao-logo.svg" alt="kakao-logo" width={20} />
              카카오로 계속하기
            </button>
            <p className={`${styles.loginFooter} body-s-medium`}>
              가입하면 melo의 <br />
              <a
                href={TERMS_AND_PRIVACY_POLICY_URL}
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
