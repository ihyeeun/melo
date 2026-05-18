export type AppTabName = "home" | "chat" | "diary" | "profile";
export type NativeTabHistoryAction = "push" | "replace";
export type WebTabStackAction = "push" | "reset";
type TabBackBehavior = "animated-pop" | "none";

export const TAB_PATH_MAP: Record<AppTabName, string> = {
  home: "/home",
  chat: "/chat",
  diary: "/diary",
  profile: "/profile",
};

export const TAB_NAVIGATION_POLICY: Record<
  AppTabName,
  {
    nativeHistory: NativeTabHistoryAction;
    webStack: WebTabStackAction;
    back: TabBackBehavior;
  }
> = {
  home: {
    nativeHistory: "replace",
    webStack: "reset",
    back: "none",
  },
  chat: {
    nativeHistory: "push",
    webStack: "push",
    back: "animated-pop",
  },
  diary: {
    nativeHistory: "replace",
    webStack: "reset",
    back: "none",
  },
  profile: {
    nativeHistory: "replace",
    webStack: "reset",
    back: "none",
  },
};

export function getTabPath(tab: AppTabName) {
  return TAB_PATH_MAP[tab];
}

export function getTabRoute(tab: AppTabName) {
  return `/(tabs)/${tab}` as const;
}

export function isAppTabName(value: unknown): value is AppTabName {
  return value === "home" || value === "chat" || value === "diary" || value === "profile";
}

export function resolveTabFromPath(pathname: string): AppTabName | null {
  const normalizedPath = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (normalizedPath === "/" || normalizedPath === TAB_PATH_MAP.home) return "home";
  if (normalizedPath === TAB_PATH_MAP.chat) return "chat";
  if (normalizedPath === TAB_PATH_MAP.diary) return "diary";
  if (normalizedPath === TAB_PATH_MAP.profile) return "profile";

  return null;
}

export function getNativeTabHistoryAction(targetTab: AppTabName, currentTab?: AppTabName) {
  if (targetTab === currentTab) return null;

  return TAB_NAVIGATION_POLICY[targetTab].nativeHistory;
}

export function getWebTabStackAction(currentTab: AppTabName | null, nextTab: AppTabName | null) {
  if (!currentTab || !nextTab || currentTab === nextTab) return "reset";

  return TAB_NAVIGATION_POLICY[nextTab].webStack;
}

export function shouldUseNativeBackOnTabExit(currentTab: AppTabName, targetTab: AppTabName) {
  return currentTab !== targetTab && TAB_NAVIGATION_POLICY[currentTab].back === "animated-pop";
}

export function shouldEnableTabBackGesture(tab: AppTabName) {
  return TAB_NAVIGATION_POLICY[tab].back === "animated-pop";
}
