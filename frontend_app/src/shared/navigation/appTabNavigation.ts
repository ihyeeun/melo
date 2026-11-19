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

// 웹이 정한 탭바 구성. 순서대로 그리고, label이 없으면 앱의 기본 이름을 쓴다
export type AppTabConfig = { tab: AppTabName; label?: string }[];

// 웹이 보낸 탭 구성을 검사한다. 모르는 탭과 중복은 버리고, 남는 게 없으면 null
export function normalizeTabConfig(value: unknown): AppTabConfig | null {
  if (!Array.isArray(value)) return null;

  const addedTabs = new Set<AppTabName>();
  const config: AppTabConfig = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;

    const { tab, label } = item as { tab?: unknown; label?: unknown };
    if (!isAppTabName(tab) || addedTabs.has(tab)) continue;

    addedTabs.add(tab);
    config.push(typeof label === "string" && label.trim() ? { tab, label: label.trim() } : { tab });
  }

  return config.length > 0 ? config : null;
}

// 앱을 시작하고 뒤로가기로 돌아오는 기준 탭. 위에 쌓이는 탭(AI 코치)은 기준이 될 수 없다
export function getRootTab(tabs: readonly AppTabName[]): AppTabName {
  return tabs.find((tab) => TAB_NAVIGATION_POLICY[tab].nativeHistory === "replace") ?? "home";
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
