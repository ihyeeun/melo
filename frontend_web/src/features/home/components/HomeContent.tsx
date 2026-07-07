import type { ReactNode } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import { MenstrualCycleSection } from "@/features/home/components/MenstrualCycleSection";
import MenuActionSection from "@/features/home/components/MenuActionSection";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import style from "@/features/home/styles/HomePage.module.css";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";

type HomeContentProps = {
  menuActionSection?: ReactNode;
  onSelectDate: (date: Date) => void;
  scoreSection?: ReactNode;
  selectedDate: Date;
  selectedDateKey: string;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
};

export default function HomeContent({
  menuActionSection,
  onSelectDate,
  scoreSection,
  selectedDate,
  selectedDateKey,
  showChatCard,
  showMenuBoardCameraCard,
}: HomeContentProps) {
  const { data: profile } = useGetProfileQuery();
  return (
    <div className={style.page}>
      <Calendar initialDate={selectedDate} onSelectDate={onSelectDate} />
      <main className={style.main}>
        {scoreSection ?? <PreviewTodayScoreSection selectedDate={selectedDateKey} />}
        {profile?.gender === 1 && <MenstrualCycleSection />}
        {menuActionSection ?? (
          <MenuActionSection
            selectedDate={selectedDateKey}
            showMenuBoardCameraCard={showMenuBoardCameraCard}
            showChatCard={showChatCard}
          />
        )}
      </main>
    </div>
  );
}
