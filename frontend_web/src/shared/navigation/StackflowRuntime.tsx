import { useEffect, useState } from "react";

import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { logout } from "@/features/settings/api/account";
import { PATH } from "@/router/path";
import { syncAppOptionalTabs } from "@/shared/api/bridge/nativeBridge";
import type { OptionalTabName } from "@/shared/api/bridge/nativeBridge.types";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
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
    refetch,
  } = useGetProfileQuery({ enabled: shouldFetchProfile });
  const isSubscribed = profile?.is_subscribed;

  useEffect(() => {
    if (typeof isSubscribed !== "boolean") {
      return;
    }

    setFreeUserGuardEnabled(!isSubscribed);
  }, [isSubscribed]);

  if (!shouldFetchProfile || typeof isSubscribed === "boolean") {
    return { status: "ready", retryProfile: refetch } as const;
  }

  // 프로필 없이 홈을 띄우면 홈의 프로필 조회가 재요청을 일으키고, 데이터가 없는 쿼리는 재요청 때
  // pending으로 돌아가 이 로딩과 홈이 끝없이 번갈아 뜬다(탈퇴 계정 무한로딩). 그래서 실패는 여기서 멈춘다
  if (isError || isSuccess) {
    return { status: "failed", retryProfile: refetch } as const;
  }

  return { status: "loading", retryProfile: refetch } as const;
}

function ProfileLoadFailedScreen({ onRetry }: { onRetry: () => void }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);

    // 앱은 signout 결과와 무관하게 토큰을 지우고 로그인 화면으로 보낸다
    const finishLogout = () => {
      setIsLoggingOut(false);
    };
    void logout().then(finishLogout, finishLogout);
  };

  return (
    <main className={styles.profileLoadFailed}>
      <div className={styles.profileLoadFailedContent}>
        <SystemIcon name="info" size={45} className={styles.profileLoadFailedIcon} />
        <h1 className="title-l-semi text-primary">정보를 불러오지 못했어요</h1>
        <p className={`${styles.profileLoadFailedDescription} body-l-medium text-secondary`}>
          잠시 후 다시 시도해주세요.
        </p>
        <Button fullWidth disabled={isLoggingOut} onClick={onRetry}>
          다시 시도
        </Button>
        <Button variant="outlined" fullWidth disabled={isLoggingOut} onClick={handleLogout}>
          {isLoggingOut ? "로그아웃 중이에요" : "로그아웃하고 다시 로그인하기"}
        </Button>
      </div>
    </main>
  );
}

export function StackflowRuntime() {
  const { status: featureGuardStatus, retryProfile } = useSyncFeatureGuardFromProfile();

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

  if (featureGuardStatus === "loading") {
    // 웹앱 최초 진입 시 한 번, 프로필 구독 상태 기반 가드 설정 준비될 때까지 뜨는 로딩
    return <LoadingScreen background="var(--background-gray-1)" />;
  }

  if (featureGuardStatus === "failed") {
    return <ProfileLoadFailedScreen onRetry={() => void retryProfile()} />;
  }

  return <StackComponent />;
}
