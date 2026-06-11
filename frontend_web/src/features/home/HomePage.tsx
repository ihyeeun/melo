import { useState } from "react";

import HomeContent from "@/features/home/components/HomeContent";
import HomeOnboardingPage from "@/features/home/components/HomeOnboardingPage";
import { HOME_ONBOARDING_STORAGE_KEY } from "@/features/home/constants/homeOnboarding";
import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { parseDateKey } from "@/shared/utils/dateFormat";

export default function HomePage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const isMenuBoardCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.MENU_BOARD_CAMERA);
  const isChatBlocked = useIsFeatureBlocked(FEATURE_GUARD.CHAT);
  const showMenuBoardCameraCard = !isMenuBoardCameraBlocked;
  const showChatCard = !isChatBlocked;
  const hasOnboardingTargets = showMenuBoardCameraCard || showChatCard;
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY) !== "done";
  });
  const shouldShowOnboarding = isOnboardingVisible && hasOnboardingTargets;
  useTabBarVisibilitySync(shouldShowOnboarding);

  const finishOnboarding = () => {
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, "done");
    setIsOnboardingVisible(false);
  };

  if (shouldShowOnboarding) {
    return (
      <HomeOnboardingPage
        selectedDate={selectedDate}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDate}
        onFinish={finishOnboarding}
        showMenuBoardCameraCard={showMenuBoardCameraCard}
        showChatCard={showChatCard}
      />
    );
  }

  return (
    <HomeContent
      selectedDate={selectedDate}
      selectedDateKey={selectedDateKey}
      onSelectDate={setSelectedDate}
      showMenuBoardCameraCard={showMenuBoardCameraCard}
      showChatCard={showChatCard}
    />
  );
}
