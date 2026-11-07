import { useEffect, useState } from "react";

import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { logout } from "@/features/settings/api/account";
import { PATH } from "@/router/path";
import { syncAppOptionalTabs } from "@/shared/api/bridge/nativeBridge";
import type { OptionalTabName } from "@/shared/api/bridge/nativeBridge.types";
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
    return <LoadingScreen background="var(--background-gray-1)" />;
  }

  return <StackComponent />;
}
