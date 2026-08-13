import type { ReactNode } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import MenuActionSection from "@/features/home/components/MenuActionSection";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import styles from "@/features/home/styles/HomePage.module.css";

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
  return (
    <div className={`page ${styles.pageColor}`}>
      <Calendar selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <main className={`main ${styles.content}`}>
        {scoreSection ?? <PreviewTodayScoreSection />}
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
