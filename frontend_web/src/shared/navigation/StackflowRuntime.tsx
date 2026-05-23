import { useEffect } from "react";

import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
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
import {
  getWebNavigationCommand,
  WEB_NAVIGATION_COMMAND_EVENT,
} from "./webNavigationCommand";

const StackComponent = getStackflowStackComponent();

function useSyncTargetsFromProfile() {
  const hasTargetsLoaded = useTargetsLoadedState();
  const targets = useTargetsState();
  const setTargets = useSetTargets();
  const isOnboardingPath =
    typeof window !== "undefined" && window.location.pathname === PATH.ONBOARDING;
  const shouldFetchProfile = hasTargetsLoaded && !targets && isNativeApp() && !isOnboardingPath;
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

  return <StackComponent />;
}
