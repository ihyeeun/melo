import AppWebViewScreen from "@/src/screens/AppWebviewScreen";
import {
  type AppTabName,
  type OptionalTabName,
  getNativeTabHistoryAction,
  getTabPath,
  getTabRoute,
  isAppTabName,
  isAppTabVisible,
  shouldEnableTabBackGesture,
  shouldUseNativeBackOnTabExit,
} from "@/src/shared/navigation/appTabNavigation";
import { requestAppExit } from "@/src/shared/navigation/appExit";
import { useEdgeSwipeBack } from "@/src/shared/navigation/useEdgeSwipeBack";
import { triggerNativeHaptic } from "@/src/shared/native/haptics";
import { router, Slot, useSegments } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeIcon from "@/assets/design-update/tab-icons/home.svg";
import ChatIcon from "@/assets/design-update/tab-icons/chat.svg";
import UserIcon from "@/assets/design-update/tab-icons/user.svg";
import RestaurantIcon from "@/assets/design-update/tab-icons/restaurant.svg";
import AnalysisIcon from "@/assets/design-update/tab-icons/analysis.svg";
import { Typo } from "@/src/shared/ui";
import { semantic, colors } from "@/src/shared/styles";

const TAB_ITEMS = [
  { tab: "home", label: "기록", Icon: HomeIcon },
  { tab: "chat", label: "AI 코치", Icon: ChatIcon },
  { tab: "analysis", label: "분석", Icon: AnalysisIcon },
  { tab: "restaurant", label: "식당", Icon: RestaurantIcon },
  { tab: "profile", label: "프로필", Icon: UserIcon },
] as const;

const ACTIVE_ICON_COLOR = colors.coral[500];
const INACTIVE_ICON_COLOR = semantic.text.tertiary;
const ACTIVE_LABEL_COLOR = semantic.text.secondary;
const INACTIVE_LABEL_COLOR = semantic.text.disabled;

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_PADDING = 6;
const TAB_GAP = 2;
const TAB_BAR_BOTTOM_GAP = 10;
const IOS_SAFE_AREA_OVERLAP = 13;

const TAB_INDICATOR_DURATION = "250ms";
const TAB_PRESS_DURATION = "120ms";
const TAB_PRESSED_SCALE = 0.95;

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
  const [optionalTabs, setOptionalTabs] = useState<OptionalTabName[] | null>(null);
  const insets = useSafeAreaInsets();
  const tabBarBottom =
    Platform.OS === "android"
      ? insets.bottom + TAB_BAR_BOTTOM_GAP
      : Math.max(insets.bottom - IOS_SAFE_AREA_OVERLAP, TAB_BAR_BOTTOM_GAP);
  const tabBarInset = tabBarBottom + TAB_BAR_HEIGHT;
  const visibleTabItems = useMemo(
    () =>
      TAB_ITEMS.filter((item) => isAppTabVisible(item.tab, optionalTabs, isFreeUserGuardEnabled)),
    [isFreeUserGuardEnabled, optionalTabs],
  );
  const reduceMotion = useReducedMotion();
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const focusedTabIndex = visibleTabItems.findIndex((item) => item.tab === currentTab);
  const tabWidth =
    (tabBarWidth - TAB_BAR_PADDING * 2 - TAB_GAP * (visibleTabItems.length - 1)) /
    visibleTabItems.length;
  const shouldHideTabBar = isTabBarHidden || currentTab === "chat";
  const shouldEnableChatBackSwipe = shouldEnableTabBackGesture(currentTab) && !isTabBarHidden;
  const requestChatBack = useCallback(() => {
    setChatBackRequestKey((key) => key + 1);
  }, []);
  const chatBackSwipe = useEdgeSwipeBack({
    enabled: shouldEnableChatBackSwipe,
    onBack: requestChatBack,
  });
  // 1번째 탭은 사용자 유형에 따라 다르다(지도 배포 후 무료 = 식당, 유료 = 홈). 탭 바 순서를 따른다
  const firstTab = visibleTabItems[0]?.tab ?? "home";
  const handleTabRootBack = useCallback(() => {
    // G-2: 1번째 탭의 루트는 종료 확인
    if (currentTab === firstTab) {
      requestAppExit();
      return;
    }

    // G-3: 그 외 탭의 루트는 1번째 탭으로 전환. AI 코치처럼 위에 쌓인 탭은 아래에 1번째 탭이 있으면 되돌아간다
    if (shouldUseNativeBackOnTabExit(currentTab, firstTab)) {
      router.dismissTo(getTabRoute(firstTab));
      return;
    }

    navigateToTab(firstTab, currentTab);
  }, [currentTab, firstTab]);

  useEffect(() => {
    if (visibleTabItems.some((item) => item.tab === currentTab)) return;

    router.replace(getTabRoute("home"));
  }, [currentTab, visibleTabItems]);

  return (
    <View style={styles.container}>
      <View style={styles.webViewContainer}>
        <AppWebViewScreen
          path={tabPath}
          currentTab={currentTab}
          chatBackRequestKey={chatBackRequestKey}
          tabBarInset={tabBarInset}
          onTabBarVisibilityChange={setIsTabBarHidden}
          onFeatureGuardEnabledChange={setIsFreeUserGuardEnabled}
          onOptionalTabsChange={setOptionalTabs}
          onRootBack={handleTabRootBack}
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
        // 탭바는 웹뷰 위에 떠 있다. 탭바 양옆 빈 곳의 터치는 웹뷰로 넘긴다
        <View pointerEvents="box-none" style={[styles.tabBarContainer, { bottom: tabBarBottom }]}>
          <View
            style={styles.tabBar}
            accessibilityRole="tablist"
            onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
          >
            {focusedTabIndex >= 0 && tabBarWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  ...styles.tabIndicator,
                  width: tabWidth,
                  transform: [{ translateX: focusedTabIndex * (tabWidth + TAB_GAP) }],
                  transitionProperty: "transform",
                  transitionDuration: reduceMotion ? "0ms" : TAB_INDICATOR_DURATION,
                  transitionTimingFunction: "ease-out",
                }}
              />
            ) : null}

            {visibleTabItems.map(({ tab, label, Icon }) => {
              const isFocused = currentTab === tab;

              return (
                <Pressable
                  key={tab}
                  style={styles.tabButton}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  onPress={() => {
                    triggerNativeHaptic("tap");
                    navigateToTab(tab, currentTab);
                  }}
                >
                  {({ pressed }) => (
                    <Animated.View
                      style={{
                        ...styles.tabPill,
                        transform: [{ scale: pressed ? TAB_PRESSED_SCALE : 1 }],
                        transitionProperty: "transform",
                        transitionDuration: reduceMotion ? "0ms" : TAB_PRESS_DURATION,
                      }}
                    >
                      <Icon
                        width={24}
                        height={24}
                        color={isFocused ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
                      />
                      <Typo
                        size={"body-s-medium"}
                        style={[
                          styles.tabLabel,
                          isFocused ? styles.tabLabelFocused : styles.tabLabelBlurred,
                        ]}
                      >
                        {label}
                      </Typo>
                    </Animated.View>
                  )}
                </Pressable>
              );
            })}
          </View>
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
  tabBarContainer: {
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderRadius: 100,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.12)",
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    padding: TAB_BAR_PADDING,
    gap: TAB_GAP,
  },
  tabIndicator: {
    backgroundColor: colors.coral[50],
    borderRadius: 100,
    bottom: TAB_BAR_PADDING,
    left: TAB_BAR_PADDING,
    position: "absolute",
    top: TAB_BAR_PADDING,
  },
  tabButton: {
    flex: 1,
  },
  tabPill: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  tabLabel: {
    marginTop: 2,
  },
  tabLabelFocused: {
    color: ACTIVE_LABEL_COLOR,
  },
  tabLabelBlurred: {
    color: INACTIVE_LABEL_COLOR,
  },
});
