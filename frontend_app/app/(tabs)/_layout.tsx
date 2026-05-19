import AppWebViewScreen from "@/src/screens/AppWebviewScreen";
import {
  type AppTabName,
  getNativeTabHistoryAction,
  getTabPath,
  getTabRoute,
  isAppTabName,
  shouldEnableTabBackGesture,
} from "@/src/shared/navigation/appTabNavigation";
import { useEdgeSwipeBack } from "@/src/shared/navigation/useEdgeSwipeBack";
import { typography } from "@/src/shared/styles/tokens";
import { router, Slot, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeIcon from "../../assets/images/Icon/home-outline.svg";
import HomeFillIcon from "../../assets/images/Icon/home-fill.svg";
import ChatIcon from "../../assets/images/Icon/chat-outline.svg";
import ChatFillIcon from "../../assets/images/Icon/chat-fill.svg";
import DiaryIcon from "../../assets/images/Icon/diary-outline.svg";
import DiaryFillIcon from "../../assets/images/Icon/diary-fill.svg";
import UserIcon from "../../assets/images/Icon/user-outline.svg";
import UserFillIcon from "../../assets/images/Icon/user-fill.svg";

const TAB_ITEMS: {
  tab: AppTabName;
  label: string;
  Icon: typeof HomeIcon;
  FocusedIcon: typeof HomeFillIcon;
}[] = [
  { tab: "home", label: "홈", Icon: HomeIcon, FocusedIcon: HomeFillIcon },
  { tab: "chat", label: "AI 코치", Icon: ChatIcon, FocusedIcon: ChatFillIcon },
  { tab: "diary", label: "다이어리", Icon: DiaryIcon, FocusedIcon: DiaryFillIcon },
  { tab: "profile", label: "프로필", Icon: UserIcon, FocusedIcon: UserFillIcon },
];
const FREE_USER_GUARD_ENABLED = true;

let lastResolvedTab: AppTabName = "home";

function resolveCurrentTab(segments: string[]): AppTabName | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const routeName = segments[index];

    if (isAppTabName(routeName)) return routeName;
  }

  return null;
}

function navigateToTab(tab: AppTabName, currentTab: AppTabName) {
  const action = getNativeTabHistoryAction(tab, currentTab);
  if (!action) return;

  if (action === "push") {
    router.push(getTabRoute(tab));
    return;
  }

  router.replace(getTabRoute(tab));
}

export default function TabsLayout() {
  const segments = useSegments();
  const resolvedTab = resolveCurrentTab(segments as string[]);
  if (resolvedTab) {
    lastResolvedTab = resolvedTab;
  }
  const currentTab = resolvedTab ?? lastResolvedTab;
  const tabPath = getTabPath(currentTab);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [chatBackRequestKey, setChatBackRequestKey] = useState(0);
  const [isFreeUserGuardEnabled, setIsFreeUserGuardEnabled] = useState(FREE_USER_GUARD_ENABLED);
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, 8);
  const visibleTabItems = useMemo(
    () => (isFreeUserGuardEnabled ? TAB_ITEMS.filter((item) => item.tab !== "chat") : TAB_ITEMS),
    [isFreeUserGuardEnabled],
  );
  const shouldHideTabBar = isTabBarHidden || currentTab === "chat";
  const shouldEnableChatBackSwipe = shouldEnableTabBackGesture(currentTab) && !isTabBarHidden;
  const requestChatBack = useCallback(() => {
    setChatBackRequestKey((key) => key + 1);
  }, []);
  const chatBackSwipe = useEdgeSwipeBack({
    enabled: shouldEnableChatBackSwipe,
    onBack: requestChatBack,
  });

  useEffect(() => {
    if (!isFreeUserGuardEnabled || currentTab !== "chat") return;

    router.replace(getTabRoute("home"));
  }, [currentTab, isFreeUserGuardEnabled]);

  return (
    <View style={styles.container}>
      <View style={styles.webViewContainer}>
        <AppWebViewScreen
          path={tabPath}
          currentTab={currentTab}
          chatBackRequestKey={chatBackRequestKey}
          onTabBarVisibilityChange={setIsTabBarHidden}
          onFeatureGuardEnabledChange={setIsFreeUserGuardEnabled}
        />
      </View>

      <View style={styles.hiddenSlot} pointerEvents="none">
        <Slot />
      </View>

      {shouldEnableChatBackSwipe ? (
        <View
          style={[styles.chatBackSwipeEdge, { width: chatBackSwipe.edgeWidth }]}
          {...chatBackSwipe.panHandlers}
        />
      ) : null}

      {!shouldHideTabBar ? (
        <View style={[styles.tabBar, { paddingBottom: tabBarBottomPadding }]}>
          {visibleTabItems.map(({ tab, label, Icon, FocusedIcon }) => {
            const isFocused = currentTab === tab;
            const RenderIcon = isFocused ? FocusedIcon : Icon;

            return (
              <Pressable
                key={tab}
                style={styles.tabButton}
                onPress={() => navigateToTab(tab, currentTab)}
              >
                <RenderIcon width={24} height={24} />
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelFocused : styles.tabLabelBlurred,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webViewContainer: {
    flex: 1,
  },
  hiddenSlot: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  chatBackSwipeEdge: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e4e4e4",
    flexDirection: "row",
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    ...typography["typo-label6"],
    marginTop: 4,
  },
  tabLabelFocused: {
    color: "#ff8e00",
  },
  tabLabelBlurred: {
    color: "#d9d9d9",
  },
});
