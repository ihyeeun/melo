import Calendar from "@/features/calendar/components/Calendar";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import RecordActionSection from "@/features/home/components/RecordActionSection";
import styles from "@/features/home/styles/HomePage.module.css";
import { ScrollFogArea } from "@/shared/commons/scrollFog";

type HomeContentProps = {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  selectedDateKey: string;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
};

export default function HomeContent({
  onSelectDate,
  selectedDate,
  selectedDateKey,
  showChatCard,
  showMenuBoardCameraCard,
}: HomeContentProps) {
  return (
    <div className={`page ${styles.pageColor}`}>
      <Calendar selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <ScrollFogArea role="main" className={`main ${styles.content}`}>
        <PreviewTodayScoreSection />
        <RecordActionSection
          selectedDate={selectedDateKey}
          showMenuBoardCameraCard={showMenuBoardCameraCard}
          showChatCard={showChatCard}
        />
      </ScrollFogArea>
    </div>
  );
}
