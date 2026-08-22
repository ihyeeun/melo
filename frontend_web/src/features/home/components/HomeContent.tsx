import { useMemo, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import type { DayCellRenderProps } from "@/features/calendar/components/dayCell";
import MenstruationDayCell from "@/features/calendar/components/menstruation/MenstruationDayCell";
import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { navigateToChatCameraIfSupported } from "@/features/camera/utils/chatCameraSupport";
import HomeDashboardModeToggle from "@/features/home/components/HomeDashboardModeToggle";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import RecordActionSection from "@/features/home/components/RecordActionSection";
import styles from "@/features/home/styles/HomePage.module.css";
import type { HomeDashboardMode } from "@/features/home/types/homeDashboard.types";
import { useGetMenstruationCyclesQuery } from "@/features/menstruation/hooks/queries/menstruation.query";
import type { MenstrualCalculateCalendar } from "@/features/menstruation/types/menstruation.type";
import {
  calculateMenstrualCalendar,
  getMenstrualPhaseByDate,
  getMenstruationDateType,
} from "@/features/menstruation/utils/menstruation.util";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { formatDateKey } from "@/shared/utils/dateFormat";

type HomeContentProps = {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  selectedDateKey: string;
};

const MENSTRUATION_HOME_USER_ID = 101;

export default function HomeContent({
  onSelectDate,
  selectedDate,
  selectedDateKey,
}: HomeContentProps) {
  const navigate = useNavigate();
  const isAiCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.MENU_BOARD_CAMERA);
  const [chatCameraUpdateUrl, setChatCameraUpdateUrl] = useState<string | null>(null);
  const [isChatCameraUpdateModalOpen, setIsChatCameraUpdateModalOpen] = useState(false);
  const [selectedDashboardMode, setSelectedDashboardMode] =
    useState<HomeDashboardMode>("menstruation");
  const profileQuery = useGetProfileQuery();
  const canToggleDashboardMode = profileQuery.data?.user_id === MENSTRUATION_HOME_USER_ID;
  const dashboardMode: HomeDashboardMode = canToggleDashboardMode
    ? selectedDashboardMode
    : "daily";
  const menstruationCyclesQuery = useGetMenstruationCyclesQuery(
    { date: selectedDateKey, limit: 7 },
    { enabled: dashboardMode === "menstruation" },
  );
  const menstruationCycles = menstruationCyclesQuery.data?.cycles;
  const menstrualCalendar = useMemo(
    () => calculateMenstrualCalendar(menstruationCycles ?? []),
    [menstruationCycles],
  );
  const menstrualPhase = useMemo(
    () => getMenstrualPhaseByDate(menstruationCycles ?? [], selectedDateKey),
    [menstruationCycles, selectedDateKey],
  );

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
        <HomeCalendar
          mode={dashboardMode}
          menstrualCalendar={menstrualCalendar?.calendar}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          showModeToggle={canToggleDashboardMode}
          onModeChange={setSelectedDashboardMode}
        />
        <ScrollFogArea role="main" className={`main ${styles.content}`}>
          <PreviewTodayScoreSection
            dashboardMode={dashboardMode}
            menstrualPhase={menstrualPhase}
            isMenstruationPending={menstruationCyclesQuery.isPending}
            profile={profileQuery.data}
            isProfileError={profileQuery.isError}
            isProfilePending={profileQuery.isPending}
          />
          <RecordActionSection selectedDate={selectedDateKey} />
        </ScrollFogArea>
      </div>

      {!isAiCameraBlocked ? (
        <FloatingCameraButton
          ariaLabel="메뉴판 또는 음식 촬영하기"
          onClick={() => {
            void handleNavigateChatCamera();
          }}
          bottomOffset={-24}
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

function HomeCalendar({
  mode,
  menstrualCalendar,
  selectedDate,
  onSelectDate,
  showModeToggle,
  onModeChange,
}: {
  mode: HomeDashboardMode;
  menstrualCalendar: MenstrualCalculateCalendar["calendar"] | undefined;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  showModeToggle: boolean;
  onModeChange: (mode: HomeDashboardMode) => void;
}) {
  const renderMenstruationDayCell = (props: DayCellRenderProps) => {
    const menstruationType = getMenstruationDateType(
      formatDateKey(props.day.date),
      menstrualCalendar,
    );

    return <MenstruationDayCell {...props} menstruationType={menstruationType} />;
  };

  return (
    <Calendar
      headerAction={
        showModeToggle ? <HomeDashboardModeToggle value={mode} onChange={onModeChange} /> : undefined
      }
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      showRecordedDots={mode === "daily"}
      renderDayCell={mode === "menstruation" ? renderMenstruationDayCell : undefined}
    />
  );
}
