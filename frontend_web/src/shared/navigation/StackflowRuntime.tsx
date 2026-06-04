import { useEffect } from "react";

import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import { LoadingScreen } from "@/shared/commons/loading/Loading";
import { setFreeUserGuardEnabled } from "@/shared/guards/featureGuard";
import {
  useSetTargets,
  useTargetsLoadedState,
  useTargetsState,
} from "@/shared/stores/targetNutrient.store";

import {
  getStackflowStackComponent,
  navigateBack,
  pushStackflowPath,
  resetStackflowWithCurrentBrowserPath,
  syncStackflowWithCurrentBrowserPath,
} from "./stackflowRouter";
import { getWebNavigationCommand, WEB_NAVIGATION_COMMAND_EVENT } from "./webNavigationCommand";

const StackComponent = getStackflowStackComponent();

const PROFILE_SYNC_EXCLUDED_PATHS = new Set([PATH.ONBOARDING, PATH.APP_INFO]);

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
  const { data: profile, isError } = useGetProfileQuery({ enabled: shouldFetchProfile });
  const isSubscribed = profile?.is_subscribed;

  useEffect(() => {
    if (typeof isSubscribed !== "boolean") {
      return;
    }

    setFreeUserGuardEnabled(!isSubscribed);
  }, [isSubscribed]);

  return !shouldFetchProfile || typeof isSubscribed === "boolean" || isError;
}

function useSyncTargetsFromProfile() {
  const hasTargetsLoaded = useTargetsLoadedState();
  const targets = useTargetsState();
  const setTargets = useSetTargets();
  const shouldFetchProfile =
    hasTargetsLoaded && !targets && isNativeApp() && shouldFetchProfileForCurrentPath();
  const { data: profile } = useGetProfileQuery({ enabled: shouldFetchProfile });

  useEffect(() => {
    if (!profile || targets) {
      return;
    }

    setTargets({
      target_calories: profile.target_calories,
      target_ratio: profile.target_ratio,
    });
  }, [profile, setTargets, targets]);
}

export function StackflowRuntime() {
  const isFeatureGuardReady = useSyncFeatureGuardFromProfile();
  useSyncTargetsFromProfile();

  useEffect(() => {
    const handleWebNavigationCommand = (event: Event) => {
      const command = getWebNavigationCommand(event);
      if (!command) return;

      window.setTimeout(() => {
        if (command.type === "BACK") {
          navigateBack({ fallbackTo: command.fallbackPath, animate: command.animate });
          return;
        }

        if (command.stackAction === "push") {
          pushStackflowPath(command.path, { animate: command.animate });
          return;
        }

        resetStackflowWithCurrentBrowserPath({ animate: command.animate });
      }, 0);
    };

    const handlePopState = () => {
      window.setTimeout(syncStackflowWithCurrentBrowserPath, 0);
    };

    window.addEventListener(WEB_NAVIGATION_COMMAND_EVENT, handleWebNavigationCommand);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(WEB_NAVIGATION_COMMAND_EVENT, handleWebNavigationCommand);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!isFeatureGuardReady) {
    // 웹앱 최초 진입 시 한 번, 프로필 구독 상태 기반 가드 설정 준비될 때까지 뜨는 로딩
    return <LoadingScreen background="var(--bg-normal)" />;
  }

  return <StackComponent />;
}
