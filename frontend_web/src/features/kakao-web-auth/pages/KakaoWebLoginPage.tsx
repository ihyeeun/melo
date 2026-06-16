import { redirectToKakaoWebLogin } from "@/features/kakao-web-auth/api/kakaoWebAuth";
import styles from "@/features/kakao-web-auth/styles/AppInfo.module.css";

export default function KakaoWebLoginPage() {
  return (
    <main className={styles.loginContainer}>
      <div className={styles.phoneFrame}>
        <div className={styles.loginWrapper}>
          <section className={styles.imageSection}>
            <img src="/login/login-logo.svg" alt="logo" height={70} />

            <img src="/login/login-image.png" alt="logo" className={styles.loginImage} />
          </section>

          <section className={styles.loginActions}>
            <button
              className={`${styles.kakaoButton} typo-label3`}
              type="button"
              onClick={redirectToKakaoWebLogin}
            >
              <img src="/login/kakao-logo.svg" alt="kakao-logo" width={20} />
              카카오로 계속하기
            </button>
            <p className={`${styles.loginFooter} typo-body3`}>
              가입하면 melo의 <br />
              <a
                href="https://third-princess-d57.notion.site/termsofuseandprivacypolicy"
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
