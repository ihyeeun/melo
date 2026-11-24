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

const UNKNOWN_FAILURE_REASON = "카카오 로그인 처리 중 오류가 발생했습니다.";

function getCallbackError(searchParams: URLSearchParams) {
  return searchParams.get("error_description") ?? searchParams.get("error");
}

function getFailureReason(error: unknown) {
  if (error instanceof KakaoWebAuthApiError) return error.message;
  if (error instanceof Error) return error.message;
  return UNKNOWN_FAILURE_REASON;
}

function getInitialCallbackState() {
  const searchParams = new URLSearchParams(window.location.search);
  const callbackError = getCallbackError(searchParams);
  const code = searchParams.get("code");

  if (callbackError) {
    return { code: null, failureReason: callbackError };
  }

  if (!code) {
    return { code: null, failureReason: "카카오 인증 코드를 받지 못했습니다." };
  }

  return { code, failureReason: "" };
}

function replacePath(path: string) {
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// screen: ONB-01-002
export default function KakaoWebCallbackPage() {
  const initialState = useMemo(() => getInitialCallbackState(), []);
  const didStartRef = useRef(false);
  // 실패 원인은 기록에만 남기고, 화면에는 원인과 상관없이 같은 안내를 보여 준다
  const [failureReason, setFailureReason] = useState(initialState.failureReason);

  useEffect(() => {
    if (failureReason) console.warn("[KakaoWebLogin] 로그인 실패", failureReason);
  }, [failureReason]);

  const retryKakaoLogin = () => {
    try {
      redirectToKakaoWebLogin();
    } catch (error) {
      setFailureReason(getFailureReason(error));
    }
  };

  useEffect(() => {
    if (initialState.failureReason || !initialState.code) return;
    if (didStartRef.current) return;
    didStartRef.current = true;

    let cancelled = false;
    const code = initialState.code;

    async function signInWithKakaoCode() {
      try {
        const res = await exchangeKakaoWebCodeForToken(code);
        const hasUserInfo = await postHasUserInfo();

        if (cancelled) return;

        if (!hasUserInfo) {
          replacePath(PATH.ONBOARDING);
          return;
        }

        if (res.user.is_subscribed === false) {
          replacePath(PATH.SETTINGS_SUB_CODE);
          return;
        }

        replacePath(PATH.APP_INFO);
      } catch (error) {
        if (cancelled) return;
        setFailureReason(getFailureReason(error));
      }
    }

    void signInWithKakaoCode();

    return () => {
      cancelled = true;
    };
  }, [initialState.code, initialState.failureReason]);

  if (failureReason) {
    return (
      <main className={styles.container}>
        <h1 className="text-primary">카카오 로그인을 하지 못했어요</h1>
        <p className={styles.description}>다시 시도해주세요</p>
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
