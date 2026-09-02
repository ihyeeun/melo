import { useEffect, useMemo, useRef, useState } from "react";

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
import { useMenstrualHistoryCoverage } from "@/features/menstruation/hooks/useMenstrualHistoryCoverage";
import { findMenstrualOwnerCycle } from "@/features/menstruation/utils/menstrualCycleContext.util";
import { isMenstrualCycleDelayed } from "@/features/menstruation/utils/menstrualHomeState.util";
import {
  calculateMenstrualPhaseDates,
  getMenstrualTypeFromPhase,
  type MenstrualPhaseDates,
} from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type { MenstrualCycleItemResponseDto } from "@/shared/api/types/api.response.dto";
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

export default function HomeContent({
  onSelectDate,
  selectedDate,
  selectedDateKey,
}: HomeContentProps) {
  const navigate = useNavigate();
  const isAiCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.MENU_BOARD_CAMERA);
  const [chatCameraUpdateUrl, setChatCameraUpdateUrl] = useState<string | null>(null);
  const [isChatCameraUpdateModalOpen, setIsChatCameraUpdateModalOpen] = useState(false);
  const [selectedDashboardMode, setSelectedDashboardMode] = useState<HomeDashboardMode>("daily");
  const [calendarCoverageStartDate, setCalendarCoverageStartDate] = useState(selectedDateKey);
  const profileQuery = useGetProfileQuery();
  const canToggleDashboardMode = profileQuery.data?.role === "ADMIN";
  const dashboardMode: HomeDashboardMode = canToggleDashboardMode ? selectedDashboardMode : "daily";
  const requiredMenstrualHistoryDate =
    calendarCoverageStartDate < selectedDateKey ? calendarCoverageStartDate : selectedDateKey;
  const menstrualHistory = useMenstrualHistoryCoverage({
    targetDate: requiredMenstrualHistoryDate,
    enabled: dashboardMode === "menstruation" && canToggleDashboardMode,
  });
  const menstrualPhaseDates = useMemo(
    () => calculateMenstrualPhaseDates(menstrualHistory.cycles) ?? [],
    [menstrualHistory.cycles],
  );
  const latestMenstrualCycleId = menstrualHistory.cycles[0]?.cycle_id ?? null;
  const phaseByCycleId = useMemo(
    () => new Map(menstrualPhaseDates.map((phaseDate) => [phaseDate.cycleId, phaseDate])),
    [menstrualPhaseDates],
  );
  const selectedOwnerCycle = findMenstrualOwnerCycle(menstrualHistory.cycles, selectedDateKey);
  const selectedPhaseDate = selectedOwnerCycle
    ? phaseByCycleId.get(selectedOwnerCycle.cycle_id)
    : undefined;
  const menstrualStatus = menstrualHistory.isContextReady
    ? (getMenstrualTypeFromPhase({
        targetDate: selectedDateKey,
        phaseDate: selectedPhaseDate,
        latestCycleId: latestMenstrualCycleId,
      }) ?? null)
    : null;
  const isMenstruationDelayed =
    menstrualHistory.isContextReady &&
    menstrualStatus == null &&
    isMenstrualCycleDelayed({ targetDate: selectedDateKey, phaseDate: selectedPhaseDate });

  const handleNavigateChatCamera = async () => {
    const result = await navigateToChatCameraIfSupported(navigate);

    if (!result.isSupported) {
      setChatCameraUpdateUrl(result.updateUrl);
      setIsChatCameraUpdateModalOpen(true);
    }
  };

  const shouldTrackMenstruationToggleRef = useRef(false);

  const handleDashboardModeChange = (mode: HomeDashboardMode) => {
    if (mode === "menstruation") {
      shouldTrackMenstruationToggleRef.current = true;
    }

    setSelectedDashboardMode(mode);
  };

  useEffect(() => {
    if (!shouldTrackMenstruationToggleRef.current) return;
    if (dashboardMode !== "menstruation") return;
    if (!menstrualHistory.isContextReady) return;

    shouldTrackMenstruationToggleRef.current = false;

    track(EVENT_NAME.CLICK_MENSTRUAL_DASHBOARD, {
      menstrual_phase: isMenstruationDelayed ? null : menstrualStatus,
    });
  }, [dashboardMode, isMenstruationDelayed, menstrualHistory.isContextReady, menstrualStatus]);

  return (
    <>
      <div className={`page ${styles.pageColor}`}>
        <HomeCalendar
          mode={dashboardMode}
          menstrualCycles={menstrualHistory.cycles}
          phaseByCycleId={phaseByCycleId}
          isMenstrualContextReady={menstrualHistory.isContextReady}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          onVisibleStartDateChange={setCalendarCoverageStartDate}
          showModeToggle={canToggleDashboardMode}
          onModeChange={handleDashboardModeChange}
        />
        <ScrollFogArea role="main" className={`main ${styles.content}`}>
          <PreviewTodayScoreSection
            dashboardMode={dashboardMode}
            menstrualStatus={menstrualStatus}
            isMenstruationDelayed={isMenstruationDelayed}
            isMenstruationPending={menstrualHistory.isContextPending}
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
  menstrualCycles,
  phaseByCycleId,
  isMenstrualContextReady,
  selectedDate,
  onSelectDate,
  onVisibleStartDateChange,
  showModeToggle,
  onModeChange,
}: {
  mode: HomeDashboardMode;
  menstrualCycles: readonly MenstrualCycleItemResponseDto[];
  phaseByCycleId: ReadonlyMap<number, MenstrualPhaseDates>;
  isMenstrualContextReady: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onVisibleStartDateChange: (dateKey: string) => void;
  showModeToggle: boolean;
  onModeChange: (mode: HomeDashboardMode) => void;
}) {
  const renderMenstruationDayCell = (props: DayCellRenderProps) => {
    const targetDate = formatDateKey(props.day.date);
    const ownerCycle = findMenstrualOwnerCycle(menstrualCycles, targetDate);
    const phaseDate = ownerCycle ? phaseByCycleId.get(ownerCycle.cycle_id) : undefined;
    const menstruationType = getMenstrualTypeFromPhase({
      targetDate,
      phaseDate: isMenstrualContextReady ? phaseDate : undefined,
      latestCycleId: menstrualCycles[0]?.cycle_id ?? null,
    });

    return <MenstruationDayCell {...props} menstruationType={menstruationType} />;
  };

  return (
    <Calendar
      headerAction={
        showModeToggle ? (
          <HomeDashboardModeToggle value={mode} onChange={onModeChange} />
        ) : undefined
      }
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      onVisibleStartDateChange={onVisibleStartDateChange}
      showRecordedDots={mode === "daily"}
      renderDayCell={mode === "menstruation" ? renderMenstruationDayCell : undefined}
    />
  );
}
