import { handleWebMessage } from "@/src/shared/api/bridge/handleWebMessage";
import { subscribeAuthExpired } from "@/src/shared/auth/authSessionEvents";
import {
  type AppTabName,
  getNativeTabHistoryAction,
  getTabRoute,
  getWebTabStackAction,
  isAppTabName,
  resolveTabFromPath,
  shouldUseNativeBackOnTabExit,
} from "@/src/shared/navigation/appTabNavigation";
import {
  createWebNavigationCommandDispatchSource,
  createWebNavigationCommandScript,
  DEFAULT_TAB_BACK_FALLBACK_PATH,
} from "@/src/shared/navigation/webNavigationCommand";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { BackHandler, Linking, Platform, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import WebView, {
  type WebViewMessageEvent,
  type WebViewNavigation,
  type WebViewProps,
} from "react-native-webview";

const devWebUrl =
  Platform.select({
    ios: "http://localhost:5173",
    android: "http://10.0.2.2:5173",
    default: "http://localhost:5173",
  }) ?? "http://localhost:5173";
const productionWebUrl = "https://melo-diet.vercel.app";
const defaultWebUrl = __DEV__ ? devWebUrl : productionWebUrl;
const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || defaultWebUrl;
const LOCAL_DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

type AppWebViewScreenProps = {
  path?: string;
  currentTab?: AppTabName;
  chatBackRequestKey?: number;
  onTabBarVisibilityChange?: (hidden: boolean) => void;
  onFeatureGuardEnabledChange?: (enabled: boolean) => void;
};

type WebViewOpenWindowEvent = Parameters<NonNullable<WebViewProps["onOpenWindow"]>>[0];

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

function resolveUrlPort(url: URL) {
  if (url.port) return url.port;
  return url.protocol === "https:" ? "443" : "80";
}

function isEquivalentLocalOrigin(requestOrigin: string, webAppOrigin: string) {
  if (requestOrigin === webAppOrigin) return true;

  try {
    const requestUrl = new URL(requestOrigin);
    const webUrl = new URL(webAppOrigin);

    const isBothLocalDevHost =
      LOCAL_DEV_HOSTNAMES.has(requestUrl.hostname) && LOCAL_DEV_HOSTNAMES.has(webUrl.hostname);
    if (!isBothLocalDevHost) return false;

    return (
      requestUrl.protocol === webUrl.protocol &&
      resolveUrlPort(requestUrl) === resolveUrlPort(webUrl)
    );
  } catch {
    return false;
  }
}

function resolveWebPath(requestUrl: string, webAppOrigin: string | null) {
  if (!webAppOrigin) return null;

  try {
    const parsed = new URL(requestUrl);
    if (!isEquivalentLocalOrigin(parsed.origin, webAppOrigin)) return null;

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

  if (
    preferBackFromChat &&
    currentTab &&
    shouldUseNativeBackOnTabExit(currentTab, targetTab) &&
    router.canGoBack()
  ) {
    router.back();
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

    const emitPath = function () {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "WEB_PATH_CHANGE",
          payload: { href: window.location.href }
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
    emitPath();
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
    fallbackPath: DEFAULT_TAB_BACK_FALLBACK_PATH,
    animate: true,
  });
}

function normalizeInset(inset: number) {
  return Math.max(0, Math.round(inset * 100) / 100);
}

function createSafeAreaSyncScript(topInset: number, bottomInset: number) {
  const normalizedTopInset = normalizeInset(topInset);
  const normalizedBottomInset = normalizeInset(bottomInset);

  return `
    (function () {
      var root = document.documentElement;
      if (!root) return;
      root.style.setProperty("--native-safe-area-top", "${normalizedTopInset}px");
      root.style.setProperty("--native-safe-area-bottom", "${normalizedBottomInset}px");
    })();
  `;
}

export default function AppWebViewScreen({
  path,
  currentTab,
  chatBackRequestKey,
  onTabBarVisibilityChange,
  onFeatureGuardEnabledChange,
}: AppWebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const initialTabUrlRef = useRef<string | null>(null);
  const canGoBackRef = useRef(false);
  const didLoadOnceRef = useRef(false);
  const didInitializeTabPathSyncRef = useRef(false);
  const pendingTabPathRef = useRef<string | null>(null);
  const previousChatBackRequestKeyRef = useRef(chatBackRequestKey);
  const previousTabRef = useRef<AppTabName | undefined>(currentTab);
  const latestWebPathRef = useRef<string | null>(null);
  const tabBarHiddenByPathRef = useRef(false);
  const tabBarHiddenByWebRef = useRef(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
    () => createSafeAreaSyncScript(insets.top, insets.bottom),
    [insets.bottom, insets.top],
  );
  const injectedScriptBeforeContentLoaded = useMemo(
    () => `${safeAreaSyncScript}${isTabWebView ? pathChangeBridgeScript : ""}true;`,
    [isTabWebView, safeAreaSyncScript],
  );

  const applyTabBarVisibility = useCallback(
    (hide: boolean) => {
      if (!isTabWebView) return;

      if (onTabBarVisibilityChange) {
        onTabBarVisibilityChange(hide);
        return;
      }

      navigation.setOptions({
        tabBarStyle: hide ? { display: "none" } : undefined,
      });
    },
    [isTabWebView, navigation, onTabBarVisibilityChange],
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

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const rawData = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          payload?: { href?: string; enabled?: boolean; isHidden?: boolean; tab?: unknown };
          context?: { href?: string };
        };

        if (typeof rawData.context?.href === "string") {
          rememberTabWebHref(rawData.context.href);
        }

        if (rawData.type === "WEB_PATH_CHANGE" && typeof rawData.payload?.href === "string") {
          rememberTabWebHref(rawData.payload.href);
          if (canSyncAfterInitialLoad()) {
            syncTabStateFromUrl(rawData.payload.href);
          }
          return;
        }

        if (isTabWebView && rawData.type === "TAB_SYNC" && isAppTabName(rawData.payload?.tab)) {
          navigateToTabRoute(rawData.payload.tab, currentTab);
          return;
        }

        if (rawData.type === "FEATURE_GUARD_SYNC" && typeof rawData.payload?.enabled === "boolean") {
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

      handleWebMessage(event, webViewRef);
    },
    [
      canSyncAfterInitialLoad,
      currentTab,
      isTabWebView,
      onFeatureGuardEnabledChange,
      rememberTabWebHref,
      syncTabBarVisibility,
      syncTabStateFromUrl,
    ],
  );

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      canGoBackRef.current = navState.canGoBack;
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
      if (!canGoBackRef.current) return false;

      webViewRef.current?.goBack();
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, []);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`${safeAreaSyncScript}true;`);
  }, [safeAreaSyncScript]);

  const onLoadEnd = useCallback(() => {
    didLoadOnceRef.current = true;
    webViewRef.current?.injectJavaScript(`${safeAreaSyncScript}true;`);

    if (!isTabWebView) return;
    flushPendingTabPathSync();
  }, [flushPendingTabPathSync, isTabWebView, safeAreaSyncScript]);

  const onOpenWindow = useCallback(async (event: WebViewOpenWindowEvent) => {
    const targetUrl = event.nativeEvent.targetUrl?.trim();
    if (!targetUrl) return;

    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;

      const href = parsed.toString();
      const canOpen = await Linking.canOpenURL(href);
      if (!canOpen) return;

      await Linking.openURL(href);
    } catch (error) {
      console.warn("Failed to open window targetUrl", targetUrl, error);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <WebView
        ref={webViewRef}
        source={webViewSource}
        injectedJavaScriptBeforeContentLoaded={injectedScriptBeforeContentLoaded}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
        onNavigationStateChange={onNavigationStateChange}
        allowsBackForwardNavigationGestures={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        style={styles.webview}
        webviewDebuggingEnabled={true}
        hideKeyboardAccessoryView
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onOpenWindow={onOpenWindow}
      />
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
});
