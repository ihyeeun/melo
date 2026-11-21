import { handleWebMessage } from "@/src/shared/api/bridge/handleWebMessage";
import { createBridgeRequestRegistry } from "@/src/shared/api/bridge/bridgeRequestRegistry";
import { subscribeAuthExpired } from "@/src/shared/auth/authSessionEvents";
import {
  type AppTabConfig,
  type AppTabName,
  type OptionalTabName,
  getNativeTabHistoryAction,
  getTabRoute,
  getWebTabStackAction,
  isAppTabName,
  normalizeOptionalTabs,
  normalizeTabConfig,
  resolveTabFromPath,
  shouldUseNativeBackOnTabExit,
} from "@/src/shared/navigation/appTabNavigation";
import {
  createWebNavigationCommandDispatchSource,
  createWebNavigationCommandScript,
} from "@/src/shared/navigation/webNavigationCommand";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import WebView, {
  type WebViewMessageEvent,
  type WebViewNavigation,
  type WebViewProps,
} from "react-native-webview";
import { LoadingOverlay, Typo } from "@/src/shared/ui";
import { semantic } from "@/src/shared/styles/color";

const APP_FOREGROUND_EVENT_NAME = "MELO_APP_FOREGROUND";
const WEBVIEW_PROCESS_RESTART_WINDOW_MS = 10_000;
const WEBVIEW_PROCESS_TERMINATED_ERROR: WebViewLoadError = {
  title: "화면을 불러오지 못했어요",
  description: "문제가 발생했어요. 잠시 후 다시 시도해주세요.",
  detail: "web content process terminated",
};
const APP_UPDATE_READY_SCRIPT = `
  window.__MELO_APP_UPDATE_READY__ = true;
  window.dispatchEvent(new Event("MELO_APP_UPDATE_READY"));
  true;
`;

function isAllowedWebProtocol(protocol: string) {
  return protocol === "https:" || (__DEV__ && protocol === "http:");
}

const webAppUrl = (() => {
  const url = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (!url) {
    throw new Error("EXPO_PUBLIC_WEB_APP_URL 환경 변수가 설정되어 있지 않습니다.");
  }

  try {
    const parsedUrl = new URL(url);
    if (!isAllowedWebProtocol(parsedUrl.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error(
      "EXPO_PUBLIC_WEB_APP_URL은 HTTPS 절대 URL이어야 합니다. HTTP는 개발 모드에서만 사용할 수 있습니다.",
    );
  }

  return url;
})();

type AppWebViewScreenProps = {
  path?: string;
  currentTab?: AppTabName;
  chatBackRequestKey?: number;
  // 떠 있는 탭바가 가리는 화면 아래 높이. 웹은 탭 첫 화면의 아래 여백에 쓴다
  tabBarInset?: number;
  onTabBarVisibilityChange?: (hidden: boolean) => void;
  onFeatureGuardEnabledChange?: (enabled: boolean) => void;
  onOptionalTabsChange?: (tabs: OptionalTabName[] | null) => void;
  onTabConfigChange?: (config: AppTabConfig) => void;
  // 웹에 더 돌아갈 화면이 없을 때(NAVIGATION_BACK) 할 일. 없으면 네이티브 화면을 되돌리고, 그것도 없으면 앱을 닫는다
  onRootBack?: () => void;
};

type WebViewOpenWindowEvent = Parameters<NonNullable<WebViewProps["onOpenWindow"]>>[0];
type WebViewShouldStartLoadEvent = Parameters<
  NonNullable<WebViewProps["onShouldStartLoadWithRequest"]>
>[0];
type WebViewLoadProgressEvent = Parameters<NonNullable<WebViewProps["onLoadProgress"]>>[0];
type WebViewLoadErrorEvent = Parameters<NonNullable<WebViewProps["onError"]>>[0];
type WebViewHttpErrorEvent = Parameters<NonNullable<WebViewProps["onHttpError"]>>[0];
type WebViewLoadError = {
  description: string;
  detail: string | null;
  title: string;
};

function buildWebAppUrl(path?: string) {
  if (!path) return webAppUrl;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    return new URL(normalizedPath, webAppUrl).toString();
  } catch {
    return `${webAppUrl.replace(/\/$/, "")}${normalizedPath}`;
  }
}

function normalizeTabPath(path?: string) {
  if (!path || path === "/") return "/home";
  return path.startsWith("/") ? path : `/${path}`;
}

function getWebAppOrigin() {
  try {
    return new URL(webAppUrl).origin;
  } catch {
    return null;
  }
}

function resolveWebPath(requestUrl: string, webAppOrigin: string | null) {
  if (!webAppOrigin) return null;

  try {
    const parsed = new URL(requestUrl);
    if (!isAllowedWebProtocol(parsed.protocol)) return null;
    if (parsed.origin !== webAppOrigin) return null;

    const canonicalUrl = new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, webAppOrigin);
    return canonicalUrl.toString();
  } catch {
    return null;
  }
}

function resolveWebPathname(requestUrl: string, webAppOrigin: string | null) {
  const href = resolveWebPath(requestUrl, webAppOrigin);
  if (!href) return null;

  try {
    return new URL(href).pathname;
  } catch {
    return null;
  }
}

function resolveTabFromUrl(requestUrl: string, webAppOrigin: string | null): AppTabName | null {
  const pathname = resolveWebPathname(requestUrl, webAppOrigin);
  if (!pathname) return null;

  return resolveTabFromPath(pathname);
}

function shouldOpenWithNativeLinking(protocol: string) {
  return protocol === "melo:" || protocol === "intent:" || protocol === "market:";
}

function isTrustedWebViewUrl(requestUrl: string, webAppOrigin: string | null) {
  if (!webAppOrigin) return false;

  try {
    const parsed = new URL(requestUrl);
    return isAllowedWebProtocol(parsed.protocol) && parsed.origin === webAppOrigin;
  } catch {
    return false;
  }
}

function shouldHideTabBar(requestUrl: string, webAppOrigin: string | null) {
  const pathname = resolveWebPathname(requestUrl, webAppOrigin);
  if (!pathname) return false;

  return resolveTabFromPath(pathname) === null;
}

function navigateToTabRoute(
  targetTab: AppTabName,
  currentTab?: AppTabName,
  { preferBackFromChat = false }: { preferBackFromChat?: boolean } = {},
) {
  const action = getNativeTabHistoryAction(targetTab, currentTab);
  if (!action) return;

  if (preferBackFromChat && currentTab && shouldUseNativeBackOnTabExit(currentTab, targetTab)) {
    router.dismissTo(getTabRoute(targetTab));
    return;
  }

  if (action === "push") {
    router.push(getTabRoute(targetTab));
    return;
  }

  router.replace(getTabRoute(targetTab));
}

const pathChangeBridgeScript = `
  (function () {
    if (window.__RN_PATH_BRIDGE__) return;
    window.__RN_PATH_BRIDGE__ = true;

    const emitPath = function (documentStarted) {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "WEB_PATH_CHANGE",
          payload: { href: window.location.href, documentStarted: documentStarted === true }
        })
      );
    };

    const wrapHistoryMethod = function (methodName) {
      const original = history[methodName];
      history[methodName] = function () {
        const result = original.apply(this, arguments);
        emitPath();
        return result;
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");

    window.addEventListener("popstate", emitPath);
    emitPath(true);
  })();
`;

function createTabPathSyncScript(
  absoluteHref: string,
  appOrigin: string | null,
  stackAction: "push" | "reset",
) {
  const serializedAbsoluteHref = JSON.stringify(absoluteHref);
  const serializedAppOrigin = JSON.stringify(appOrigin);
  const serializedStackAction = JSON.stringify(stackAction);

  return `
    (function () {
      var passedAbsoluteUrl = ${serializedAbsoluteHref};
      var appOrigin = ${serializedAppOrigin};
      var stackAction = ${serializedStackAction};
      if (typeof passedAbsoluteUrl !== "string" || passedAbsoluteUrl.length === 0) return;

      var targetUrl;
      try {
        targetUrl = new URL(passedAbsoluteUrl);
      } catch {
        return;
      }

      var nextPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;
      if (targetUrl.origin !== window.location.origin) {
        if (typeof appOrigin === "string" && appOrigin.length > 0) {
          try {
            location.replace(new URL(nextPath, appOrigin).toString());
            return;
          } catch {
            // no-op
          }
        }

        location.replace(passedAbsoluteUrl);
        return;
      }

      var currentPath = window.location.pathname + window.location.search + window.location.hash;
      if (nextPath === currentPath) return;

      var syncCommand = {
        type: "SYNC_TAB_PATH",
        href: targetUrl.href,
        path: nextPath,
        stackAction: stackAction,
        animate: false
      };

      if (stackAction === "push") {
        ${createWebNavigationCommandDispatchSource("syncCommand")}
        return;
      }

      history.replaceState(null, "", nextPath);

      ${createWebNavigationCommandDispatchSource("syncCommand")}

      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "WEB_PATH_CHANGE",
          payload: { href: window.location.href }
        })
      );
    })();
    true;
  `;
}

function createNativeBackRequestScript() {
  return createWebNavigationCommandScript({
    type: "BACK",
    animate: true,
  });
}

function createAppForegroundEventScript() {
  const serializedEventName = JSON.stringify(APP_FOREGROUND_EVENT_NAME);
  const serializedDetail = JSON.stringify({
    foregroundedAt: Date.now(),
  });

  return `
    (function () {
      var eventName = ${serializedEventName};
      var detail = ${serializedDetail};

      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
      } catch {
        var event = document.createEvent("Event");
        event.initEvent(eventName, true, true);
        event.detail = detail;
        window.dispatchEvent(event);
      }
    })();
    true;
  `;
}

function normalizeInset(inset: number) {
  return Math.max(0, Math.round(inset * 100) / 100);
}

function createSafeAreaSyncScript(topInset: number, bottomInset: number, tabBarInset?: number) {
  const normalizedTopInset = normalizeInset(topInset);
  const normalizedBottomInset = normalizeInset(bottomInset);
  const tabBarInsetScript =
    tabBarInset === undefined
      ? ""
      : `root.style.setProperty("--native-tab-bar-inset", "${normalizeInset(tabBarInset)}px");`;

  return `
    (function () {
      var root = document.documentElement;
      if (!root) return;
      root.style.setProperty("--native-safe-area-top", "${normalizedTopInset}px");
      root.style.setProperty("--native-safe-area-bottom", "${normalizedBottomInset}px");
      ${tabBarInsetScript}
    })();
  `;
}

function formatWebViewLoadError(event: WebViewLoadErrorEvent): WebViewLoadError {
  const { code, description, url } = event.nativeEvent;
  const detail = [typeof code === "number" ? `code=${code}` : null, description, url]
    .filter(Boolean)
    .join(" · ");

  return {
    title: "웹 화면을 불러오지 못했어요",
    description: "서버 연결이나 네트워크 상태를 확인한 뒤 다시 시도해주세요.",
    detail: detail || null,
  };
}

function formatWebViewHttpError(event: WebViewHttpErrorEvent): WebViewLoadError | null {
  const { statusCode, url } = event.nativeEvent;

  if (statusCode < 500) return null;

  return {
    title: "서버 연결이 불안정해요",
    description: "서버 응답이 정상적이지 않아요. 잠시 후 다시 시도해주세요.",
    detail: `status=${statusCode}${url ? ` · ${url}` : ""}`,
  };
}

export default function AppWebViewScreen({
  path,
  currentTab,
  chatBackRequestKey,
  tabBarInset,
  onTabBarVisibilityChange,
  onFeatureGuardEnabledChange,
  onOptionalTabsChange,
  onTabConfigChange,
  onRootBack,
}: AppWebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [apiRequests] = useState(createBridgeRequestRegistry);
  const appStateRef = useRef(AppState.currentState);
  const initialTabUrlRef = useRef<string | null>(null);
  const didLoadOnceRef = useRef(false);
  const didInitializeTabPathSyncRef = useRef(false);
  const hasWebViewLoadErrorRef = useRef(false);
  const pendingTabPathRef = useRef<string | null>(null);
  const previousChatBackRequestKeyRef = useRef(chatBackRequestKey);
  const previousTabRef = useRef<AppTabName | undefined>(currentTab);
  const latestWebPathRef = useRef<string | null>(null);
  const tabBarHiddenByPathRef = useRef(false);
  const tabBarHiddenByWebRef = useRef(false);
  const lastProcessTerminatedAtRef = useRef<number | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isInitialWebViewLoading, setIsInitialWebViewLoading] = useState(true);
  const [webViewLoadError, setWebViewLoadError] = useState<WebViewLoadError | null>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isUpdatePending } = Updates.useUpdates();
  const isTabWebView = Boolean(currentTab);
  const normalizedTabPath = useMemo(() => normalizeTabPath(path), [path]);
  const webAppOrigin = getWebAppOrigin();
  if (isTabWebView && initialTabUrlRef.current === null) {
    initialTabUrlRef.current = buildWebAppUrl(normalizedTabPath);
  }
  const targetUrl = isTabWebView
    ? (initialTabUrlRef.current ?? buildWebAppUrl(normalizedTabPath))
    : buildWebAppUrl(path);

  const webViewSource = useMemo(() => ({ uri: targetUrl }), [targetUrl]);
  const safeAreaSyncScript = useMemo(
    () => createSafeAreaSyncScript(insets.top, insets.bottom, tabBarInset),
    [insets.bottom, insets.top, tabBarInset],
  );
  const injectedScriptBeforeContentLoaded = useMemo(
    () => `${safeAreaSyncScript}${isTabWebView ? pathChangeBridgeScript : ""}true;`,
    [isTabWebView, safeAreaSyncScript],
  );

  const applyTabBarVisibility = useCallback(
    (hide: boolean) => {
      if (!isTabWebView) return;

      onTabBarVisibilityChange?.(hide);
    },
    [isTabWebView, onTabBarVisibilityChange],
  );

  const syncTabBarVisibility = useCallback(
    ({ hideByPath, hideByWeb }: { hideByPath?: boolean; hideByWeb?: boolean }) => {
      if (!isTabWebView) return;

      if (hideByPath !== undefined) {
        tabBarHiddenByPathRef.current = hideByPath;
      }

      if (hideByWeb !== undefined) {
        tabBarHiddenByWebRef.current = hideByWeb;
      }

      applyTabBarVisibility(tabBarHiddenByPathRef.current || tabBarHiddenByWebRef.current);
    },
    [applyTabBarVisibility, isTabWebView],
  );

  const syncTabBarFromUrl = useCallback(
    (url: string) => {
      if (!isTabWebView) return;

      syncTabBarVisibility({ hideByPath: shouldHideTabBar(url, webAppOrigin) });
    },
    [isTabWebView, syncTabBarVisibility, webAppOrigin],
  );

  const syncTabStateFromUrl = useCallback(
    (url: string) => {
      if (!isTabWebView) return;

      syncTabBarFromUrl(url);

      if (!currentTab) return;

      const targetTab = resolveTabFromUrl(url, webAppOrigin);
      if (!targetTab || targetTab === currentTab) return;

      navigateToTabRoute(targetTab, currentTab, { preferBackFromChat: true });
    },
    [currentTab, isTabWebView, syncTabBarFromUrl, webAppOrigin],
  );

  const syncWebViewPathFromTab = useCallback(
    (nextPath: string) => {
      if (!isTabWebView) return;
      if (!webAppOrigin) return;

      let nextHref: string;
      try {
        nextHref = new URL(nextPath, webAppOrigin).toString();
      } catch {
        return;
      }
      if (latestWebPathRef.current === nextHref) return;

      const currentWebTab = latestWebPathRef.current
        ? resolveTabFromUrl(latestWebPathRef.current, webAppOrigin)
        : (previousTabRef.current ?? null);
      const nextWebTab = resolveTabFromUrl(nextHref, webAppOrigin);
      const stackAction = getWebTabStackAction(currentWebTab, nextWebTab);

      webViewRef.current?.injectJavaScript(
        createTabPathSyncScript(nextHref, webAppOrigin, stackAction),
      );
    },
    [isTabWebView, webAppOrigin],
  );

  const rememberTabWebHref = useCallback(
    (url: string) => {
      if (!isTabWebView) return;

      const webHref = resolveWebPath(url, webAppOrigin);
      if (!webHref) return;

      latestWebPathRef.current = webHref;
    },
    [isTabWebView, webAppOrigin],
  );

  useEffect(() => {
    if (!isTabWebView) return;

    const unsubscribe = subscribeAuthExpired(() => {
      latestWebPathRef.current = null;
    });

    return unsubscribe;
  }, [isTabWebView]);

  const canSyncAfterInitialLoad = useCallback(() => {
    return didLoadOnceRef.current && pendingTabPathRef.current === null;
  }, []);

  const dispatchAppForegroundToWeb = useCallback(() => {
    if (!didLoadOnceRef.current) return;
    if (hasWebViewLoadErrorRef.current) return;

    webViewRef.current?.injectJavaScript(createAppForegroundEventScript());
  }, []);

  const flushPendingTabPathSync = useCallback(() => {
    if (!isTabWebView) return;
    if (!didLoadOnceRef.current) return;

    const pendingTabPath = pendingTabPathRef.current;
    if (!pendingTabPath) return;

    pendingTabPathRef.current = null;
    if (!canSyncAfterInitialLoad()) return;

    syncWebViewPathFromTab(pendingTabPath);
  }, [canSyncAfterInitialLoad, isTabWebView, syncWebViewPathFromTab]);

  useEffect(() => {
    if (!isTabWebView) return;

    if (!didInitializeTabPathSyncRef.current) {
      didInitializeTabPathSyncRef.current = true;
      return;
    }

    pendingTabPathRef.current = normalizedTabPath;
    flushPendingTabPathSync();
  }, [currentTab, flushPendingTabPathSync, isTabWebView, normalizedTabPath]);

  useEffect(() => {
    previousTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const didEnterForeground = previousState !== "active" && nextState === "active";
      if (!didEnterForeground) return;

      dispatchAppForegroundToWeb();
    });

    return () => {
      subscription.remove();
    };
  }, [dispatchAppForegroundToWeb]);

  useEffect(() => {
    if (!isTabWebView || currentTab !== "chat") {
      previousChatBackRequestKeyRef.current = chatBackRequestKey;
      return;
    }

    if (previousChatBackRequestKeyRef.current === chatBackRequestKey) return;

    previousChatBackRequestKeyRef.current = chatBackRequestKey;
    webViewRef.current?.injectJavaScript(createNativeBackRequestScript());
  }, [chatBackRequestKey, currentTab, isTabWebView]);

  useEffect(() => {
    if (!isTabWebView) return;

    tabBarHiddenByPathRef.current = false;
    tabBarHiddenByWebRef.current = false;
    applyTabBarVisibility(false);

    return () => {
      tabBarHiddenByPathRef.current = false;
      tabBarHiddenByWebRef.current = false;
      applyTabBarVisibility(false);
    };
  }, [applyTabBarVisibility, isTabWebView]);

  useEffect(() => () => apiRequests.cancelAll(), [apiRequests]);

  const onLoadStart = useCallback(() => {
    // Android also emits onLoadStart for SPA history changes. Tab WebViews
    // report actual document starts through the injected path bridge instead.
    if (!isTabWebView) apiRequests.cancelAll();
  }, [apiRequests, isTabWebView]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const messageUrl = event.nativeEvent.url?.trim();
      if (!messageUrl || !isTrustedWebViewUrl(messageUrl, webAppOrigin)) {
        console.warn("[WebView] blocked message from untrusted URL", messageUrl);
        return;
      }

      try {
        const rawData = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          payload?: {
            href?: string;
            enabled?: boolean;
            isHidden?: boolean;
            tab?: unknown;
            optionalTabs?: unknown;
            tabs?: unknown;
            documentStarted?: boolean;
          };
          context?: { href?: string };
        };

        if (rawData.type === "NAVIGATION_BACK" && onRootBack) {
          onRootBack();
          return;
        }

        if (rawData.type === "TAB_CONFIG_SET") {
          if (!isTabWebView) return;

          const optionalTabs = normalizeOptionalTabs(rawData.payload?.optionalTabs);
          if (optionalTabs !== null) onOptionalTabsChange?.(optionalTabs);

          const tabConfig = normalizeTabConfig(rawData.payload?.tabs);
          if (tabConfig !== null) onTabConfigChange?.(tabConfig);
          return;
        }

        if (typeof rawData.context?.href === "string") {
          rememberTabWebHref(rawData.context.href);
        }

        if (rawData.type === "WEB_PATH_CHANGE" && typeof rawData.payload?.href === "string") {
          if (rawData.payload.documentStarted === true) {
            apiRequests.cancelAll();
            didLoadOnceRef.current = false;
            onOptionalTabsChange?.(null);
          }
          rememberTabWebHref(rawData.payload.href);
          if (canSyncAfterInitialLoad()) {
            syncTabStateFromUrl(rawData.payload.href);
          }
          return;
        }

        if (isTabWebView && rawData.type === "TAB_SYNC" && isAppTabName(rawData.payload?.tab)) {
          navigateToTabRoute(rawData.payload.tab, currentTab, { preferBackFromChat: true });
          return;
        }

        if (
          rawData.type === "FEATURE_GUARD_SYNC" &&
          typeof rawData.payload?.enabled === "boolean"
        ) {
          onFeatureGuardEnabledChange?.(rawData.payload.enabled);
          return;
        }

        if (
          rawData.type === "TAB_BAR_VISIBILITY_SYNC" &&
          typeof rawData.payload?.isHidden === "boolean"
        ) {
          syncTabBarVisibility({ hideByWeb: rawData.payload.isHidden });
          return;
        }
      } catch {
        // no-op
      }

      void handleWebMessage(event, webViewRef, apiRequests);
    },
    [
      canSyncAfterInitialLoad,
      currentTab,
      apiRequests,
      isTabWebView,
      onFeatureGuardEnabledChange,
      onOptionalTabsChange,
      onRootBack,
      onTabConfigChange,
      rememberTabWebHref,
      syncTabBarVisibility,
      syncTabStateFromUrl,
      webAppOrigin,
    ],
  );

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      rememberTabWebHref(navState.url);

      if (canSyncAfterInitialLoad()) {
        syncTabStateFromUrl(navState.url);
      }
    },
    [canSyncAfterInitialLoad, rememberTabWebHref, syncTabStateFromUrl],
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.isFocused()) return false;
      if (!didLoadOnceRef.current) return false;

      // 탭이 아닌 화면(회원가입 등)도 웹에 맡긴다. 웹이 화면 안 모달을 먼저 닫고 쌓인 화면을 되돌리며,
      // 더 돌아갈 화면이 없으면 앱에 뒤로가기를 넘긴다(NAVIGATION_BACK)
      webViewRef.current?.injectJavaScript(createNativeBackRequestScript());
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, [navigation]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`${safeAreaSyncScript}true;`);
  }, [safeAreaSyncScript]);

  useEffect(() => {
    if (!isUpdatePending) return;

    webViewRef.current?.injectJavaScript(APP_UPDATE_READY_SCRIPT);
  }, [isUpdatePending]);

  const onLoadProgress = useCallback((event: WebViewLoadProgressEvent) => {
    if (event.nativeEvent.progress >= 1) {
      setIsInitialWebViewLoading(false);
    }
  }, []);

  const onLoadEnd = useCallback(() => {
    setIsInitialWebViewLoading(false);

    if (hasWebViewLoadErrorRef.current) {
      return;
    }

    didLoadOnceRef.current = true;
    webViewRef.current?.injectJavaScript(`${safeAreaSyncScript}true;`);

    // 다운로드가 웹 로드보다 먼저 끝난 경우에도 웹이 알 수 있도록 다시 전달한다
    if (isUpdatePending) {
      webViewRef.current?.injectJavaScript(APP_UPDATE_READY_SCRIPT);
    }

    if (!isTabWebView) return;
    flushPendingTabPathSync();
  }, [flushPendingTabPathSync, isTabWebView, isUpdatePending, safeAreaSyncScript]);

  const onLoadError = useCallback((event: WebViewLoadErrorEvent) => {
    const error = formatWebViewLoadError(event);

    hasWebViewLoadErrorRef.current = true;
    setIsInitialWebViewLoading(false);
    setWebViewLoadError(error);
    console.warn("[WebView] load failed", event.nativeEvent);
  }, []);

  const onHttpError = useCallback((event: WebViewHttpErrorEvent) => {
    const error = formatWebViewHttpError(event);
    if (!error) return;

    hasWebViewLoadErrorRef.current = true;
    setIsInitialWebViewLoading(false);
    setWebViewLoadError(error);
    console.warn("[WebView] http error", event.nativeEvent);
  }, []);

  const retryWebViewLoad = useCallback(() => {
    apiRequests.cancelAll();
    hasWebViewLoadErrorRef.current = false;
    didLoadOnceRef.current = false;
    latestWebPathRef.current = null;
    pendingTabPathRef.current = isTabWebView ? normalizedTabPath : null;
    setWebViewLoadError(null);
    setIsInitialWebViewLoading(true);
    setWebViewKey((key) => key + 1);
  }, [apiRequests, isTabWebView, normalizedTabPath]);

  // 웹 화면 프로세스가 죽은 웹뷰는 흰 화면으로 남고 다시 쓸 수 없어서 새로 띄운다
  const onWebViewProcessTerminated = useCallback(() => {
    const now = Date.now();
    const lastTerminatedAt = lastProcessTerminatedAtRef.current;
    lastProcessTerminatedAtRef.current = now;

    // 새로 띄우자마자 또 죽으면 반복되지 않게 오류 화면에서 멈춘다
    if (lastTerminatedAt !== null && now - lastTerminatedAt < WEBVIEW_PROCESS_RESTART_WINDOW_MS) {
      apiRequests.cancelAll();
      hasWebViewLoadErrorRef.current = true;
      setIsInitialWebViewLoading(false);
      setWebViewLoadError(WEBVIEW_PROCESS_TERMINATED_ERROR);
      return;
    }

    retryWebViewLoad();
  }, [apiRequests, retryWebViewLoad]);

  const openExternalUrl = useCallback(async (targetUrl: string) => {
    try {
      const parsed = new URL(targetUrl);
      const href = parsed.toString();

      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const canOpen = await Linking.canOpenURL(href);
        if (!canOpen) return false;

        await Linking.openURL(href);
        return true;
      }

      if (shouldOpenWithNativeLinking(parsed.protocol)) {
        await Linking.openURL(href);
        return true;
      }
    } catch (error) {
      console.warn("Failed to open external URL", targetUrl, error);
    }

    return false;
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request: WebViewShouldStartLoadEvent) => {
      const targetUrl = request.url?.trim();
      if (!targetUrl) return true;
      if (!request.isTopFrame) return true;

      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          if (isTrustedWebViewUrl(targetUrl, webAppOrigin)) return true;

          void openExternalUrl(targetUrl);
          return false;
        }

        if (!shouldOpenWithNativeLinking(parsed.protocol)) return false;

        void openExternalUrl(targetUrl);
        return false;
      } catch {
        return false;
      }
    },
    [openExternalUrl, webAppOrigin],
  );

  const onOpenWindow = useCallback(
    async (event: WebViewOpenWindowEvent) => {
      const targetUrl = event.nativeEvent.targetUrl?.trim();
      if (!targetUrl) return;

      await openExternalUrl(targetUrl);
    },
    [openExternalUrl],
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={webViewSource}
        injectedJavaScriptBeforeContentLoaded={injectedScriptBeforeContentLoaded}
        onMessage={onMessage}
        onLoadStart={onLoadStart}
        onLoadProgress={onLoadProgress}
        onLoadEnd={onLoadEnd}
        onError={onLoadError}
        onHttpError={onHttpError}
        onContentProcessDidTerminate={onWebViewProcessTerminated}
        onRenderProcessGone={onWebViewProcessTerminated}
        onNavigationStateChange={onNavigationStateChange}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        allowsBackForwardNavigationGestures={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        style={styles.webview}
        webviewDebuggingEnabled={true}
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onOpenWindow={onOpenWindow}
      />
      {isInitialWebViewLoading && !webViewLoadError ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <LoadingOverlay />
        </View>
      ) : null}
      {webViewLoadError ? (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContent}>
            <Typo size="title-s-semi" allowFontScaling={false} style={styles.errorTitle}>
              {webViewLoadError.title}
            </Typo>
            <Typo allowFontScaling={false} style={styles.errorDescription}>
              {webViewLoadError.description}
            </Typo>
            {__DEV__ && webViewLoadError.detail ? (
              <Typo allowFontScaling={false} style={styles.errorDetail}>
                {webViewLoadError.detail}
              </Typo>
            ) : null}
            <Pressable
              onPress={retryWebViewLoad}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.retryButtonPressed : null,
              ]}
            >
              <Typo allowFontScaling={false} style={styles.retryButtonText}>
                다시 시도
              </Typo>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    bottom: 0,
    gap: 10,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  errorOverlay: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 24,
    position: "absolute",
    right: 0,
    top: 0,
  },
  errorContent: {
    alignItems: "center",
    width: "100%",
  },
  errorTitle: {
    textAlign: "center",
    color: semantic.text.accent,
  },
  errorDescription: {
    color: semantic.text.secondary,
    marginTop: 8,
    textAlign: "center",
  },
  errorDetail: {
    color: semantic.text.secondary,
    marginTop: 10,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: semantic.btn.default,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 48,
    width: "100%",
    paddingHorizontal: 22,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: semantic.text.accent,
  },
});
