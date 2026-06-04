import { useCallback, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import HomeOnboardingOverlay from "@/features/home/components/HomeOnboardingOverlay";
import MenuActionSection from "@/features/home/components/MenuActionSection";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import { HOME_ONBOARDING_STORAGE_KEY } from "@/features/home/constants/homeOnboarding";
import style from "@/features/home/styles/HomePage.module.css";
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
  const [readyHomeContentDateKey, setReadyHomeContentDateKey] = useState<string | null>(null);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY) !== "done";
  });
  const isHomeContentReady = readyHomeContentDateKey === selectedDateKey;
  const shouldShowOnboarding = isOnboardingVisible && hasOnboardingTargets && isHomeContentReady;
  useTabBarVisibilitySync(shouldShowOnboarding);

  const handleHomeContentReadyChange = useCallback((dateKey: string, isReady: boolean) => {
    setReadyHomeContentDateKey((previousDateKey) => {
      if (isReady) return dateKey;
      return previousDateKey === dateKey ? null : previousDateKey;
    });
  }, []);

  const finishOnboarding = () => {
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, "done");
    setIsOnboardingVisible(false);
  };

  return (
    <div className={style.page}>
      <Calendar initialDate={selectedDate} onSelectDate={setSelectedDate} />
      <main className={style.main}>
        <PreviewTodayScoreSection
          selectedDate={selectedDateKey}
          onReadyChange={handleHomeContentReadyChange}
        />
        <MenuActionSection
          selectedDate={selectedDateKey}
          showMenuBoardCameraCard={showMenuBoardCameraCard}
          showChatCard={showChatCard}
        />
      </main>
      {shouldShowOnboarding ? (
        <HomeOnboardingOverlay
          onFinish={finishOnboarding}
          showMenuBoardCameraCard={showMenuBoardCameraCard}
          showChatCard={showChatCard}
        />
      ) : null}
    </div>
  );
}
