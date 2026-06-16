import { useEffect, useMemo, useRef, useState } from "react";

import {
  exchangeKakaoWebCodeForToken,
  KakaoWebAuthApiError,
  postHasUserInfo,
  redirectToKakaoWebLogin,
} from "@/features/kakao-web-auth/api/kakaoWebAuth";
import styles from "@/features/kakao-web-auth/styles/AppInfo.module.css";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";

const DEFAULT_ERROR_MESSAGE = "카카오 로그인 처리 중 오류가 발생했습니다.";

function getCallbackError(searchParams: URLSearchParams) {
  return searchParams.get("error_description") ?? searchParams.get("error");
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof KakaoWebAuthApiError) return error.message;
  if (error instanceof Error) return error.message;
  return DEFAULT_ERROR_MESSAGE;
}

function getInitialCallbackState() {
  const searchParams = new URLSearchParams(window.location.search);
  const callbackError = getCallbackError(searchParams);
  const code = searchParams.get("code");

  if (callbackError) {
    return { code: null, errorMessage: callbackError };
  }

  if (!code) {
    return { code: null, errorMessage: "카카오 인증 코드를 받지 못했습니다." };
  }

  return { code, errorMessage: "" };
}

function replacePath(path: string) {
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function KakaoWebCallbackPage() {
  const initialState = useMemo(() => getInitialCallbackState(), []);
  const didStartRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState(initialState.errorMessage);

  const retryKakaoLogin = () => {
    try {
      redirectToKakaoWebLogin();
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    }
  };

  useEffect(() => {
    if (initialState.errorMessage || !initialState.code) return;
    if (didStartRef.current) return;
    didStartRef.current = true;

    let cancelled = false;
    const code = initialState.code;

    async function signInWithKakaoCode() {
      try {
        await exchangeKakaoWebCodeForToken(code);
        const hasUserInfo = await postHasUserInfo();

        if (cancelled) return;

        replacePath(hasUserInfo === true ? PATH.APP_INFO : PATH.ONBOARDING);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(getLoginErrorMessage(error));
      }
    }

    void signInWithKakaoCode();

    return () => {
      cancelled = true;
    };
  }, [initialState.code, initialState.errorMessage]);

  if (errorMessage) {
    return (
      <main className={styles.container}>
        <h1 className="textNormal">카카오 로그인 실패</h1>
        <p className={styles.description}>{errorMessage}</p>
        <div className={styles.actions}>
          <Button className={styles.actionButton} onClick={retryKakaoLogin}>
            다시 시도
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <LoadingIndicator label="카카오 로그인 처리 중입니다." />
    </main>
  );
}
