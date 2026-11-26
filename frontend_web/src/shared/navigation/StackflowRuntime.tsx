import { captureMessage } from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { hasValidDayNutritionTarget } from "@/features/home/utils/dayMealSummary";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { logout } from "@/features/settings/api/account";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/apiClient";
import {
  isNativeApp,
  requestNativeSignUpRedirect,
  syncAppTab,
  syncAppTabConfig,
} from "@/shared/api/bridge/nativeBridge";
import type { AppTabName } from "@/shared/api/bridge/nativeBridge.types";
import { useNativeAppFeature } from "@/shared/api/bridge/useNativeAppFeature";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingScreen } from "@/shared/commons/loading/Loading";
import { setFreeUserGuardEnabled } from "@/shared/guards/featureGuard";
import {
  APP_OPTIONAL_TABS,
  APP_TAB_PATHS,
  APP_TABS,
  getAppStartTab,
} from "@/shared/navigation/appTabConfig";

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

const PROFILE_SYNC_EXCLUDED_PATHS = new Set([PATH.ONBOARDING, PATH.APP_INFO]);
const USER_INFO_NOT_FOUND_STATUS_CODE = 40411;
const STACKFLOW_HISTORY_STATE_TAG = "@stackflow/plugin-history-sync";
// 앱이 이 문서를 앱 진입(실행 · 로그인 · 가입 완료)으로 띄웠는지. 웹뷰를 다시 띄운 경우에는 표시하지 않는다
const isAppEntryDocument = typeof window !== "undefined" && window.__MELO_APP_ENTRY__ === true;

type EntryStartTab = { tab: AppTabName; path: string };

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
    error,
    isSuccess,
    isError,
    refetch,
  } = useGetProfileQuery({ enabled: shouldFetchProfile });
  const isSubscribed = profile?.is_subscribed;
  // 가입을 마치지 않아 회원 정보나 목표가 없는 계정
  const isSignUpRequired =
    shouldFetchProfile &&
    ((error instanceof AppApiError && error.statusCode === USER_INFO_NOT_FOUND_STATUS_CODE) ||
      (profile !== undefined && !hasValidDayNutritionTarget(profile)));

  useEffect(() => {
    if (typeof isSubscribed !== "boolean") {
      return;
    }

    setFreeUserGuardEnabled(!isSubscribed);
    syncAppTabConfig({
      optionalTabs: APP_OPTIONAL_TABS,
      tabs: isSubscribed ? APP_TABS.paid : APP_TABS.free,
    });
  }, [isSubscribed]);

  if (!shouldFetchProfile || typeof isSubscribed === "boolean") {
    return { status: "ready", isSubscribed, isSignUpRequired, retryProfile: refetch } as const;
  }

  // 프로필 없이 홈을 띄우면 홈의 프로필 조회가 재요청을 일으키고, 데이터가 없는 쿼리는 재요청 때
  // pending으로 돌아가 이 로딩과 홈이 끝없이 번갈아 뜬다(탈퇴 계정 무한로딩). 그래서 실패는 여기서 멈춘다
  if (isError || isSuccess) {
    return { status: "failed", isSubscribed, isSignUpRequired, retryProfile: refetch } as const;
  }

  return { status: "loading", isSubscribed, isSignUpRequired, retryProfile: refetch } as const;
}

// 앱에 들어오자마자 시작 탭이 아닌 탭의 첫 화면이 열렸으면 시작 탭을 돌려준다.
// 앱은 지난번에 받은 탭 구성으로 시작하고 로그인 직후에는 기록 탭으로 들어오므로, 구독 여부를 아는 여기서 맞춘다
function resolveEntryStartTab(isSubscribed: boolean | undefined): EntryStartTab | null {
  if (!isAppEntryDocument || typeof isSubscribed !== "boolean") return null;

  const currentPath = normalizePathname(window.location.pathname);
  if (!Object.values(APP_TAB_PATHS).includes(currentPath)) return null;

  const tab = getAppStartTab(isSubscribed);
  const path = APP_TAB_PATHS[tab];
  if (!path || path === currentPath) return null;

  return { tab, path };
}

// 회원가입으로 보낼 수 있는지. 앱은 이 기능을 지원해야 회원가입 화면을 띄우고, 확인 중이면 undefined다
function useCanRedirectToSignUp() {
  const isNative = isNativeApp();
  const canNativeRedirect = useNativeAppFeature("SIGN_UP_REDIRECT");

  return isNative ? canNativeRedirect : true;
}

function redirectToSignUp() {
  if (isNativeApp()) {
    requestNativeSignUpRedirect();
    return;
  }

  window.location.replace(PATH.ONBOARDING);
}

function ProfileLoadFailedScreen({ onRetry }: { onRetry: () => void }) {
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const error = queryClient.getQueryState(queryKeys.profile)?.error;
    captureMessage("Profile load failed screen shown", {
      level: "error",
      tags:
        error instanceof AppApiError
          ? { status_code: String(error.statusCode), error_code: error.error }
          : undefined,
    });
  }, [queryClient]);

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
  const {
    status: featureGuardStatus,
    isSubscribed,
    isSignUpRequired,
    retryProfile,
  } = useSyncFeatureGuardFromProfile();
  const canRedirectToSignUp = useCanRedirectToSignUp();
  // 이 기능이 없는 옛 앱에서는 지금처럼 홈 문구나 불러오기 실패 화면을 보여 준다
  const shouldRedirectToSignUp = isSignUpRequired && canRedirectToSignUp !== false;
  const canRenderStack = featureGuardStatus === "ready" && !shouldRedirectToSignUp;
  // 화면을 처음 그리기 직전에 한 번만 정한다(undefined = 아직 안 정함). Stack은 첫 화면을 처음 그릴 때만 읽는다
  const [entryStartTab, setEntryStartTab] = useState<EntryStartTab | null>();
  if (canRenderStack && entryStartTab === undefined) {
    setEntryStartTab(resolveEntryStartTab(isSubscribed));
  }

  useEffect(() => {
    if (isSignUpRequired && canRedirectToSignUp) {
      redirectToSignUp();
    }
  }, [isSignUpRequired, canRedirectToSignUp]);

  useEffect(() => {
    if (entryStartTab) syncAppTab(entryStartTab.tab);
  }, [entryStartTab]);

  useEffect(() => {
    const handleWebNavigationCommand = (event: Event) => {
      const command = getWebNavigationCommand(event);
      if (!command) return;

      window.setTimeout(() => {
        if (command.type === "BACK") {
          // 앱의 뒤로가기(Android 뒤로가기·AI 코치 스와이프)는 사용자 동작이라 모달을 먼저 닫는다
          navigateBack({ animate: command.animate, closeOverlayFirst: true });
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
    syncAppTabConfig({ optionalTabs: APP_OPTIONAL_TABS });

    return () => {
      window.removeEventListener(WEB_NAVIGATION_COMMAND_EVENT, handleWebNavigationCommand);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (featureGuardStatus === "loading" || shouldRedirectToSignUp) {
    // 웹앱 최초 진입 시 한 번, 프로필 구독 상태 기반 가드 설정 준비될 때까지 뜨는 로딩
    return <LoadingScreen background="var(--background-gray-1)" />;
  }

  if (featureGuardStatus === "failed") {
    return <ProfileLoadFailedScreen onRetry={() => void retryProfile()} />;
  }

  // 시작 탭으로 바꿀 때는 기록 탭을 그렸다 옮기지 않고 처음부터 시작 탭 화면으로 만든다
  return (
    <StackComponent
      initialContext={entryStartTab ? { req: { path: entryStartTab.path } } : undefined}
    />
  );
}
