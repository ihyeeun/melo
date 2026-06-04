import "./App.css";

import { lazy, Suspense, useEffect, useState } from "react";

import KakaoWebCallbackPage from "@/features/auth/KakaoWebCallbackPage";
import KakaoWebLoginPage from "@/features/auth/KakaoWebLoginPage";
import { PATH } from "@/router/path";
import { initAnalytics, track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { initNativeBridgeListener } from "@/shared/api/bridge/nativeBridge";
import { LoadingScreen } from "@/shared/commons/loading/Loading";
import { syncFeatureGuardStateToApp } from "@/shared/guards/featureGuard";
import { initContentInteractionGuard } from "@/shared/utils/contentInteractionGuard";
import { initInputCharacterRestriction } from "@/shared/utils/inputCharacterRestriction";

const StackflowRuntime = lazy(() =>
  import("@/shared/navigation/StackflowRuntime").then((module) => ({
    default: module.StackflowRuntime,
  })),
);

function getCurrentPathname() {
  if (typeof window === "undefined") return PATH.ROOT;
  const pathname = window.location.pathname;

  return pathname !== PATH.ROOT && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export default function App() {
  const [pathname, setPathname] = useState(getCurrentPathname);

  useEffect(() => {
    initAnalytics();
    track(EVENT_NAME.APP_OPEN);
    const cleanupNativeBridgeListener = initNativeBridgeListener();
    const cleanupContentInteractionGuard = initContentInteractionGuard();
    const cleanupInputCharacterRestriction = initInputCharacterRestriction();
    syncFeatureGuardStateToApp();

    return () => {
      cleanupInputCharacterRestriction();
      cleanupContentInteractionGuard();
      cleanupNativeBridgeListener();
    };
  }, []);

  useEffect(() => {
    const syncPathname = () => {
      setPathname(getCurrentPathname());
    };

    window.addEventListener("popstate", syncPathname);

    return () => {
      window.removeEventListener("popstate", syncPathname);
    };
  }, []);

  if (pathname === PATH.KAKAO_WEB_LOGIN) {
    return (
      <div className="app-container">
        <KakaoWebLoginPage />
      </div>
    );
  }

  if (pathname === PATH.KAKAO_WEB_CALLBACK) {
    return (
      <div className="app-container">
        <KakaoWebCallbackPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Suspense fallback={<LoadingScreen background="var(--bg-normal)" />}>
        <StackflowRuntime />
      </Suspense>
    </div>
  );
}
