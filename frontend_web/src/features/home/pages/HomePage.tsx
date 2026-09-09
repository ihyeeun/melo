import { useRef, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import MenstruationDayCell from "@/features/calendar/components/menstruation/MenstruationDayCell";
import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { navigateToChatCameraIfSupported } from "@/features/camera/utils/chatCameraSupport";
import HomeDashboardModeToggle from "@/features/home/components/HomeDashboardModeToggle";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import RecordActionSection from "@/features/home/components/RecordActionSection";
import styles from "@/features/home/styles/HomePage.module.css";
import type { HomeDashboardMode } from "@/features/home/types/homeDashboard.types";
import { useMenstrualPhase } from "@/features/menstruation/hooks/useMenstrualPhase";
import { getMenstrualCalendarStatus } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export default function HomePage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const navigate = useNavigate();
  const isAiCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.MENU_BOARD_CAMERA);
  const [chatCameraUpdateUrl, setChatCameraUpdateUrl] = useState<string | null>(null);
  const [isChatCameraUpdateModalOpen, setIsChatCameraUpdateModalOpen] = useState(false);
  const [mode, setMode] = useState<HomeDashboardMode>("daily");
  const [calendarStartDate, setCalendarStartDate] = useState(selectedDateKey);
  const menstrualPhase = useMenstrualPhase(selectedDateKey, {
    enabled: mode === "menstruation",
    historyStartDate: calendarStartDate,
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollToTop = () => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  const { data: profile, isPending: isProfilePending } = useGetProfileQuery();
  // const menstrualApplicants = [42, 50, 52, 53, 74, 80];
  const canDashboardMode =
    profile?.role === "ADMIN" &&
    // menstrualApplicants.includes(profile!.user_id) &&
    !isProfilePending;

  const handleNavigateChatCamera = async () => {
    const result = await navigateToChatCameraIfSupported(navigate);

    if (!result.isSupported) {
      setChatCameraUpdateUrl(result.updateUrl);
      setIsChatCameraUpdateModalOpen(true);
    }
  };
  return (
    <>
      <div className={`page ${styles.pageColor}`}>
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onVisibleStartDateChange={setCalendarStartDate}
          showRecordedDots={mode === "daily"}
          renderDayCell={
            mode === "menstruation"
              ? (props) => (
                  <MenstruationDayCell
                    {...props}
                    menstruationType={getMenstrualCalendarStatus({
                      targetDate: formatDateKey(props.day.date),
                      cycles: menstrualPhase.cycles,
                      latestPhaseDate:
                        menstrualPhase.isLoading || menstrualPhase.isError
                          ? null
                          : menstrualPhase.latestPhaseDate,
                    })}
                  />
                )
              : undefined
          }
        />
        {canDashboardMode && (
          <HomeDashboardModeToggle
            className={styles.modeToggle}
            value={mode}
            onChange={setMode}
            onClick={scrollToTop}
          />
        )}
        <ScrollFogArea role="main" ref={contentRef} className={`main ${styles.content}`}>
          <PreviewTodayScoreSection homeMode={mode} menstrualPhase={menstrualPhase} />
          <RecordActionSection />
        </ScrollFogArea>
      </div>

      {!isAiCameraBlocked ? (
        <FloatingCameraButton
          ariaLabel="메뉴판 또는 음식 촬영하기"
          onClick={() => {
            void handleNavigateChatCamera();
          }}
          bottomOffset={0}
        />
      ) : null}

      <ChatCameraUpdateRequiredModal
        open={isChatCameraUpdateModalOpen}
        updateUrl={chatCameraUpdateUrl}
        onOpenChange={setIsChatCameraUpdateModalOpen}
      />
    </>
  );
}
