import { focusManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { logout } from "@/features/settings/api/account";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/apiClient";
import { syncAppOptionalTabs } from "@/shared/api/bridge/nativeBridge";
import type { OptionalTabName } from "@/shared/api/bridge/nativeBridge.types";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { LoadingScreen } from "@/shared/commons/loading/Loading";
import { setFreeUserGuardEnabled } from "@/shared/guards/featureGuard";

import {
  consumeExpectedStackflowPopState,
  getStackflowStackComponent,
  navigateBack,
  pushStackflowPath,
  resetStackflowWithCurrentBrowserPath,
  syncStackflowWithCurrentBrowserPath,
} from "./stackflowRouter";
import styles from "./StackflowRuntime.module.css";
import { getWebNavigationCommand, WEB_NAVIGATION_COMMAND_EVENT } from "./webNavigationCommand";

const StackComponent = getStackflowStackComponent();

const WEB_OPTIONAL_TABS: readonly OptionalTabName[] = ["restaurant", "analysis"];

const PROFILE_SYNC_EXCLUDED_PATHS = new Set([PATH.ONBOARDING, PATH.APP_INFO]);
const STACKFLOW_HISTORY_STATE_TAG = "@stackflow/plugin-history-sync";
// 정상이라면 signout 응답 직후 앱이 로그인 화면으로 이동하면서 이 웹뷰가 사라진다
const ORPHAN_SESSION_END_FALLBACK_DELAY_MS = 3000;

function isStackflowHistoryState(state: unknown) {
  if (typeof state !== "object" || state === null) {
    return false;
  }

  const stackflowState = "usr" in state ? state.usr : state;

  return (
    typeof stackflowState === "object" &&
    stackflowState !== null &&
    "_TAG" in stackflowState &&
    stackflowState._TAG === STACKFLOW_HISTORY_STATE_TAG
  );
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function shouldFetchProfileForCurrentPath() {
  if (typeof window === "undefined") return true;

  return !PROFILE_SYNC_EXCLUDED_PATHS.has(normalizePathname(window.location.pathname));
}

function useSyncFeatureGuardFromProfile() {
  const shouldFetchProfile = shouldFetchProfileForCurrentPath();
  const {
    data: profile,
    isSuccess,
    isError,
  } = useGetProfileQuery({
    enabled: shouldFetchProfile,
  });
  const isSubscribed = profile?.is_subscribed;
  const isOrphanSession = shouldFetchProfile && isSuccess && typeof isSubscribed !== "boolean";
  const [hasOrphanSessionEndFailed, setHasOrphanSessionEndFailed] = useState(false);

  useEffect(() => {
    if (typeof isSubscribed !== "boolean") {
      return;
    }

    setFreeUserGuardEnabled(!isSubscribed);
  }, [isSubscribed]);

  useEffect(() => {
    if (!isOrphanSession) return;

    // 앱은 signout 결과와 무관하게 토큰을 지우고 로그인 화면으로 보낸다
    const markFailedLater = () => {
      window.setTimeout(() => {
        setHasOrphanSessionEndFailed(true);
      }, ORPHAN_SESSION_END_FALLBACK_DELAY_MS);
    };

    void logout().then(markFailedLater, markFailedLater);
  }, [isOrphanSession]);

  if (hasOrphanSessionEndFailed) {
    // 화면이 남아 있으면 signout이 앱에 닿지 못한 것: 에러 화면의 '다시 시도'(새로고침)로 다시 보낸다
    throw new Error("만료된 세션을 정리하지 못했습니다.");
  }

  return !shouldFetchProfile || typeof isSubscribed === "boolean" || isError;
}

// TODO: 탈퇴 계정 무한로딩 원인을 파악하면 제거
const GUARD_LOADING_RECOVERY_DELAY_MS = 15_000;

function getErrorCode(error: unknown) {
  if (error instanceof AppApiError) return `${error.statusCode}:${error.error}`;
  if (error instanceof Error) return error.name;
  return "-";
}

// 로딩이 길어지면 원인과 무관하게 빠져나올 수 있는 로그아웃 버튼과, 스크린샷으로 원인을 알 수 있는 진단 한 줄을 보여준다
function GuardLoadingRecovery() {
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsVisible(true);
    }, GUARD_LOADING_RECOVERY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isVisible) return null;

  const profileState = queryClient.getQueryState<ProfileResponseDto | null>(queryKeys.profile);
  const diagnostic = [
    `profile=${profileState ? `${profileState.status}/${profileState.fetchStatus}` : "none"}`,
    `fail=${profileState?.fetchFailureCount ?? "-"}`,
    `reason=${getErrorCode(profileState?.fetchFailureReason ?? profileState?.error)}`,
    `data=${profileState?.data === null ? "null" : typeof profileState?.data}`,
    `sub=${String(profileState?.data?.is_subscribed)}`,
    `online=${navigator.onLine}`,
    `focus=${focusManager.isFocused()}`,
  ].join(" ");

  const handleLogout = () => {
    setIsLoggingOut(true);

    // 앱은 signout 결과와 무관하게 토큰을 지우고 로그인 화면으로 보낸다
    const finishLogout = () => {
      setIsLoggingOut(false);
    };
    void logout().then(finishLogout, finishLogout);
  };

  return (
    <div className={styles.loadingRecovery}>
      <p className="body-s-medium text-secondary">로딩이 오래 걸리고 있어요</p>
      <Button variant="outlined" size="s" fullWidth disabled={isLoggingOut} onClick={handleLogout}>
        {isLoggingOut ? "로그아웃 중이에요" : "로그아웃하고 다시 로그인하기"}
      </Button>
      <p className="caption-s-medium text-tertiary">{diagnostic}</p>
    </div>
  );
}

export function StackflowRuntime() {
  const isFeatureGuardReady = useSyncFeatureGuardFromProfile();

  useEffect(() => {
    const handleWebNavigationCommand = (event: Event) => {
      const command = getWebNavigationCommand(event);
      if (!command) return;

      window.setTimeout(() => {
        if (command.type === "BACK") {
          navigateBack({ animate: command.animate });
          return;
        }

        if (command.stackAction === "push") {
          pushStackflowPath(command.path, { animate: command.animate });
          return;
        }

        resetStackflowWithCurrentBrowserPath({ animate: command.animate });
      }, 0);
    };

    const handlePopState = (event: PopStateEvent) => {
      // During a programmatic multi-pop, Stackflow has already applied the final stack while
      // browser history is still visiting intermediate entries. Ignore only those expected
      // events; user-driven popstate events still reconcile the current browser path.
      if (isStackflowHistoryState(event.state) && consumeExpectedStackflowPopState()) {
        return;
      }

      window.setTimeout(syncStackflowWithCurrentBrowserPath, 0);
    };

    window.addEventListener(WEB_NAVIGATION_COMMAND_EVENT, handleWebNavigationCommand);
    window.addEventListener("popstate", handlePopState);

    // A full WebView reload can change browser history before this lazy runtime
    // mounts (for example, returning from a removed tab to home).
    syncStackflowWithCurrentBrowserPath({ animate: false });

    // Install navigation listeners before a hidden tab can redirect to home.
    syncAppOptionalTabs(WEB_OPTIONAL_TABS);

    return () => {
      window.removeEventListener(WEB_NAVIGATION_COMMAND_EVENT, handleWebNavigationCommand);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!isFeatureGuardReady) {
    // 웹앱 최초 진입 시 한 번, 프로필 구독 상태 기반 가드 설정 준비될 때까지 뜨는 로딩
    return (
      <>
        <LoadingScreen background="var(--background-gray-1)" />
        <GuardLoadingRecovery />
      </>
    );
  }

  return <StackComponent />;
}
