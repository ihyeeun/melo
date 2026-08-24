import { useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { navigateToChatCameraIfSupported } from "@/features/camera/utils/chatCameraSupport";
import PreviewTodayScoreSection from "@/features/home/components/PreviewTodayScoreSection";
import RecordActionSection from "@/features/home/components/RecordActionSection";
import styles from "@/features/home/styles/HomePage.module.css";
import { FloatingCameraButton } from "@/shared/commons/button/FloatingCameraButton";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

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
        <Calendar selectedDate={selectedDate} onSelectDate={onSelectDate} />
        <ScrollFogArea role="main" className={`main ${styles.content}`}>
          <PreviewTodayScoreSection />
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
