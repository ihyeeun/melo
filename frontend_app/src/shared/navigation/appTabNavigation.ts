export type AppTabName = "home" | "chat" | "diary" | "restaurant" | "analysis" | "profile";
export type NativeTabHistoryAction = "push" | "replace";
export type WebTabStackAction = "push" | "reset";
type TabBackBehavior = "animated-pop" | "none";

const OPTIONAL_TABS = ["diary", "restaurant", "analysis"] as const;
export type OptionalTabName = (typeof OPTIONAL_TABS)[number];
const DEFAULT_OPTIONAL_TABS: readonly OptionalTabName[] = [];

export function normalizeOptionalTabs(value: unknown): OptionalTabName[] | null {
  if (!Array.isArray(value) || !value.every((tab) => typeof tab === "string")) return null;

  const acceptedTabs = OPTIONAL_TABS.filter((tab) => value.includes(tab));
  return value.length > 0 && acceptedTabs.length === 0 ? null : acceptedTabs;
}

export function isAppTabVisible(
  tab: AppTabName,
  optionalTabs: readonly OptionalTabName[] | null,
  isFreeUserGuardEnabled: boolean,
) {
  if (tab === "chat") return !isFreeUserGuardEnabled;
  if (tab === "home" || tab === "profile") return true;
  return (optionalTabs ?? DEFAULT_OPTIONAL_TABS).includes(tab);
}

export const TAB_PATH_MAP: Record<AppTabName, string> = {
  home: "/home",
  chat: "/chat",
  diary: "/diary",
  restaurant: "/restaurant",
  analysis: "/personal-analysis",
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
  restaurant: {
    nativeHistory: "replace",
    webStack: "reset",
    back: "none",
  },
  analysis: {
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
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TAB_PATH_MAP, value);
}

export function resolveTabFromPath(pathname: string): AppTabName | null {
  const normalizedPath =
    pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (normalizedPath === "/") return "home";
  return (
    (Object.keys(TAB_PATH_MAP) as AppTabName[]).find(
      (tab) => TAB_PATH_MAP[tab] === normalizedPath,
    ) ?? null
  );
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
