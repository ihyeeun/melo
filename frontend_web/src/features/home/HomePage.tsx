import { useCallback, useEffect, useRef, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import HomeOnboardingOverlay from "@/features/home/components/HomeOnboardingOverlay";
import MenuActionSection from "@/features/home/components/MenuActionSection";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import { HOME_ONBOARDING_STORAGE_KEY } from "@/features/home/constants/homeOnboarding";
import style from "@/features/home/styles/HomePage.module.css";
import { beginBottomSheetVisibilitySync } from "@/shared/api/bridge/nativeBridge";
import { FEATURE_GUARD, isFeatureBlocked } from "@/shared/guards/featureGuard";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { parseDateKey } from "@/shared/utils/dateFormat";

export default function HomePage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const endOnboardingVisibilitySyncRef = useRef<(() => void) | null>(null);
  const showMenuBoardCameraCard = !isFeatureBlocked(FEATURE_GUARD.MENU_BOARD_CAMERA);
  const showChatCard = !isFeatureBlocked(FEATURE_GUARD.CHAT);
  const hasOnboardingTargets = showMenuBoardCameraCard || showChatCard;
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY) !== "done";
  });

  const endOnboardingVisibilitySync = useCallback(() => {
    endOnboardingVisibilitySyncRef.current?.();
    endOnboardingVisibilitySyncRef.current = null;
  }, []);

  const finishOnboarding = () => {
    endOnboardingVisibilitySync();
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, "done");
    setIsOnboardingVisible(false);
  };

  useEffect(() => {
    if (!isOnboardingVisible || !hasOnboardingTargets) {
      endOnboardingVisibilitySync();
      return;
    }

    const endVisibilitySync = beginBottomSheetVisibilitySync();
    endOnboardingVisibilitySyncRef.current = endVisibilitySync;

    return () => {
      if (endOnboardingVisibilitySyncRef.current === endVisibilitySync) {
        endOnboardingVisibilitySyncRef.current = null;
      }

      endVisibilitySync();
    };
  }, [endOnboardingVisibilitySync, hasOnboardingTargets, isOnboardingVisible]);

  return (
    <div className={style.container}>
      <div className={style.calendarWrapper}>
        <Calendar initialDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>
      <section className={style.homeContainer}>
        <PreviewTodayScoreSection selectedDate={selectedDateKey} />
        <MenuActionSection
          selectedDate={selectedDateKey}
          showMenuBoardCameraCard={showMenuBoardCameraCard}
          showChatCard={showChatCard}
        />
      </section>
      {isOnboardingVisible && hasOnboardingTargets ? (
        <HomeOnboardingOverlay
          onFinish={finishOnboarding}
          showMenuBoardCameraCard={showMenuBoardCameraCard}
          showChatCard={showChatCard}
        />
      ) : null}
    </div>
  );
}
