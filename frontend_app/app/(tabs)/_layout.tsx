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
import { triggerNativeHaptic } from "@/src/shared/native/haptics";
import { router, Slot, useSegments } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeIcon from "../../assets/design-update/tab-icons/home.svg";
import ChatIcon from "../../assets/design-update/tab-icons/chat.svg";
import DiaryIcon from "../../assets/design-update/tab-icons/diary.svg";
import UserIcon from "../../assets/design-update/tab-icons/user.svg";
import { Typo } from "@/src/shared/ui";
import { semantic, colors } from "@/src/shared/styles";

const TAB_ITEMS = [
  { tab: "home", label: "홈", Icon: HomeIcon },
  { tab: "chat", label: "AI 코치", Icon: ChatIcon },
  { tab: "diary", label: "다이어리", Icon: DiaryIcon },
  { tab: "profile", label: "프로필", Icon: UserIcon },
] as const;

const ACTIVE_TAB_COLOR = colors.coral[500];
const INACTIVE_TAB_COLOR = semantic.text.tertiary;

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
  const tabBarBottomPadding = Math.max(insets.bottom, 4);
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
          {visibleTabItems.map(({ tab, label, Icon }) => {
            const isFocused = currentTab === tab;

            return (
              <Pressable
                key={tab}
                style={styles.tabButton}
                onPress={() => {
                  triggerNativeHaptic("tap");
                  navigateToTab(tab, currentTab);
                }}
              >
                <Icon
                  width={24}
                  height={24}
                  color={isFocused ? ACTIVE_TAB_COLOR : INACTIVE_TAB_COLOR}
                />
                <Typo
                  size={isFocused ? "body-s-semi" : "body-s-regular"}
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelFocused : styles.tabLabelBlurred,
                  ]}
                >
                  {label}
                </Typo>
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
    borderTopWidth: 1,
    borderTopColor: semantic.border.default,
    flexDirection: "row",
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    marginTop: 2,
  },
  tabLabelFocused: {
    color: ACTIVE_TAB_COLOR,
  },
  tabLabelBlurred: {
    color: INACTIVE_TAB_COLOR,
  },
});
