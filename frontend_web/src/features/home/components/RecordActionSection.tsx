import { useState } from "react";

import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { navigateToChatCameraIfSupported } from "@/features/camera/utils/chatCameraSupport";
import ActionCard from "@/features/home/components/cards/ActionCard";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import styles from "@/features/home/styles/RecordActionSection.module.css";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { getWorkoutRecordPath } from "@/router/pathHelpers";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

export default function RecordActionSection({
  selectedDate,
  showChatCard,
  showMenuBoardCameraCard,
}: {
  selectedDate: string;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
}) {
  const navigate = useNavigate();
  const { data: profile } = useGetProfileQuery();
  const canAccessWorkoutRecord = profile?.role === "ADMIN";
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
    <div className={styles.content}>
      <div className={styles.menuContainer}>
        {showMenuBoardCameraCard ? (
          <MenuCard
            title={"메뉴 찍기"}
            iconSrc="/icons/camera-icon.svg"
            onClick={handleNavigateChatCamera}
            type="camera"
          />
        ) : null}
        {showChatCard ? (
          <MenuCard
            title={"AI 코치"}
            iconSrc="/icons/chat-icon.svg"
            onClick={() => {
              if (isNativeApp()) {
                syncAppTab("chat");
                return;
              }

              navigate(PATH.CHAT);
            }}
          />
        ) : null}
      </div>
      {canAccessWorkoutRecord ? (
        <ActionCard
          className={styles.workoutCard}
          onClick={() => navigate(getWorkoutRecordPath(selectedDate))}
        >
          <p className="typo-title4">운동 기록</p>
        </ActionCard>
      ) : null}

      <TodayBodyLogSection date={selectedDate} />

      <ChatCameraUpdateRequiredModal
        open={isChatCameraUpdateModalOpen}
        updateUrl={chatCameraUpdateUrl}
        onOpenChange={(open) => {
          setIsChatCameraUpdateModalOpen(open);
        }}
      />
    </div>
  );
}

function MenuCard({
  title,
  description,
  iconSrc,
  onClick,
  type,
}: {
  title: string;
  description?: string;
  iconSrc: string;
  onClick?: () => void;
  type?: string;
}) {
  return (
    <ActionCard onClick={onClick} className={type === "camera" ? styles.bgPrimary : ""}>
      <div className={styles.menuCardContainer}>
        <p
          className={`${styles.description} ${type === "camera" ? styles.textWhite : ""} typo-body3`}
        >
          {description}
        </p>

        <img src={iconSrc} alt={`${title} 아이콘`} width={56} height={56} />
        <p className={`typo-title4 ${type === "camera" ? styles.textWhite : ""}`}>{title}</p>
      </div>
    </ActionCard>
  );
}
