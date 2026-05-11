import { useEffect } from "react";

import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import {
  useSetTargets,
  useTargetsLoadedState,
  useTargetsState,
} from "@/shared/stores/targetNutrient.store";

import { getStackflowStackComponent, syncStackflowWithCurrentBrowserPath } from "./stackflowRouter";

const StackComponent = getStackflowStackComponent();
const NATIVE_PATH_SYNC_EVENT = "MELO_NATIVE_PATH_SYNC";

function useSyncTargetsFromProfile() {
  const hasTargetsLoaded = useTargetsLoadedState();
  const targets = useTargetsState();
  const setTargets = useSetTargets();
  const shouldFetchProfile = hasTargetsLoaded && !targets && isNativeApp();
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
    const handleNativePathSync = () => {
      window.setTimeout(() => syncStackflowWithCurrentBrowserPath({ animate: false }), 0);
    };

    const handlePopState = () => {
      window.setTimeout(syncStackflowWithCurrentBrowserPath, 0);
    };

    window.addEventListener(NATIVE_PATH_SYNC_EVENT, handleNativePathSync);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(NATIVE_PATH_SYNC_EVENT, handleNativePathSync);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return <StackComponent />;
}
