import { useState } from "react";

import ActionCard from "@/features/home/components/cards/ActionCard";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import style from "@/features/home/styles/MenuActionSection.module.css";
import { PATH } from "@/router/path";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

export default function MenuActionSection({
  selectedDate,
  showChatCard,
  showMenuBoardCameraCard,
}: {
  selectedDate: string;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
}) {
  const navigate = useNavigate();
  const [isCameraActionSheetOpen, setIsCameraActionSheetOpen] = useState(false);

  const handleOpenCameraActionSheet = () => {
    setIsCameraActionSheetOpen(true);
  };

  const handleCloseCameraActionSheet = () => {
    setIsCameraActionSheetOpen(false);
  };

  const handleNavigateMenuBoardCamera = () => {
    handleCloseCameraActionSheet();
    navigate(PATH.MENU_BOARD_CAMERA, {
      state: {
        autoOpenCamera: true,
      },
    });
  };

  const handleNavigateFoodCamera = () => {
    handleCloseCameraActionSheet();
    navigate(PATH.CHAT_FOOD_CAMERA);
  };

  return (
    <div className={style.content}>
      <div className={style.menuContainer}>
        {showMenuBoardCameraCard ? (
          <div data-home-onboarding-target="menu-board-camera">
            <MenuCard
              title={"메뉴 촬영"}
              description="메뉴판이나 음식을 찍어 피드백을 받아보세요"
              iconSrc="/icons/camera-icon.svg"
              onClick={handleOpenCameraActionSheet}
              type="camera"
            />
          </div>
        ) : null}
        {showChatCard ? (
          <div data-home-onboarding-target="chat">
            <MenuCard
              title={"AI 코치"}
              description={"식단 고민,\n무엇이든 물어보세요"}
              iconSrc="/icons/chat-icon.svg"
              onClick={() => {
                if (isNativeApp()) {
                  syncAppTab("chat");
                  return;
                }

                navigate(PATH.CHAT);
              }}
            />
          </div>
        ) : null}
      </div>

      <TodayBodyLogSection date={selectedDate} />

      <BottomSheet isOpen={isCameraActionSheetOpen} onClose={handleCloseCameraActionSheet}>
        <div className={style.cameraActionSheetContainer}>
          <h2 className={`${style.cameraActionSheetTitle} typo-title2`}>무엇을 촬영할까요?</h2>
          <div>
            <button
              type="button"
              onClick={handleNavigateMenuBoardCamera}
              className={style.cameraActionSheetButton}
            >
              <p className={`typo-label2`}>메뉴판 촬영</p>
            </button>

            <div className="divider" />

            <button
              type="button"
              className={style.cameraActionSheetButton}
              onClick={handleNavigateFoodCamera}
            >
              <p className={`typo-label2`}>음식 촬영</p>
            </button>
          </div>
        </div>
      </BottomSheet>
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
  description: string;
  iconSrc: string;
  onClick: () => void;
  type?: string;
}) {
  return (
    <ActionCard onClick={onClick} className={type === "camera" ? style.bgPrimary : ""}>
      <div className={style.menuCardContainer}>
        <p className={`typo-title4 ${type === "camera" ? style.textWhite : ""}`}>{title}</p>
        <p className={`${style.description} ${type === "camera" ? style.textWhite : ""} typo-body3`}>
          {description}
        </p>
        <div className={style.iconContainer}>
          <img src={iconSrc} alt={`${title} 아이콘`} className={style.iconSize} />
        </div>
      </div>
    </ActionCard>
  );
}
