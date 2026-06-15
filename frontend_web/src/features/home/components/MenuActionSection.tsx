import { type ReactNode, useCallback, useState } from "react";

import ActionCard from "@/features/home/components/cards/ActionCard";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import type { HomeOnboardingTarget } from "@/features/home/constants/homeOnboarding";
import style from "@/features/home/styles/MenuActionSection.module.css";
import { PATH } from "@/router/path";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

export default function MenuActionSection({
  activeOnboardingTarget,
  bodyLogSection,
  disableInteractions = false,
  renderOnboardingBubble,
  selectedDate,
  showChatCard,
  showMenuBoardCameraCard,
}: {
  activeOnboardingTarget?: HomeOnboardingTarget | null;
  bodyLogSection?: ReactNode;
  disableInteractions?: boolean;
  renderOnboardingBubble?: (target: HomeOnboardingTarget) => ReactNode;
  selectedDate: string;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
}) {
  const navigate = useNavigate();
  const [isCameraActionSheetOpen, setIsCameraActionSheetOpen] = useState(false);

  const handleOpenCameraActionSheet = useCallback(() => {
    setIsCameraActionSheetOpen(true);
  }, []);

  const handleCloseCameraActionSheet = useCallback(() => {
    setIsCameraActionSheetOpen(false);
  }, []);

  const handleNavigateMenuBoardCamera = () => {
    handleCloseCameraActionSheet();
    navigate(PATH.MENU_BOARD_CAMERA);
  };

  const handleNavigateFoodCamera = () => {
    handleCloseCameraActionSheet();
    navigate(PATH.CHAT_FOOD_CAMERA);
  };

  return (
    <div className={style.content}>
      <div className={style.menuContainer}>
        {showMenuBoardCameraCard ? (
          <OnboardingTargetFrame
            target="menu-board-camera"
            activeTarget={activeOnboardingTarget}
            renderBubble={renderOnboardingBubble}
          >
            <MenuCard
              title={"메뉴 찍기"}
              description="메뉴판이나 음식을 찍어 피드백을 받아보세요"
              iconSrc="/icons/camera-icon.svg"
              onClick={disableInteractions ? undefined : handleOpenCameraActionSheet}
              type="camera"
            />
          </OnboardingTargetFrame>
        ) : null}
        {showChatCard ? (
          <OnboardingTargetFrame
            target="chat"
            activeTarget={activeOnboardingTarget}
            renderBubble={renderOnboardingBubble}
          >
            <MenuCard
              title={"AI 코치"}
              description={"식단 고민,\n무엇이든 물어보세요"}
              iconSrc="/icons/chat-icon.svg"
              onClick={
                disableInteractions
                  ? undefined
                  : () => {
                      if (isNativeApp()) {
                        syncAppTab("chat");
                        return;
                      }

                      navigate(PATH.CHAT);
                    }
              }
            />
          </OnboardingTargetFrame>
        ) : null}
      </div>

      {bodyLogSection ?? <TodayBodyLogSection date={selectedDate} />}

      {disableInteractions ? null : (
        <BottomSheet isOpen={isCameraActionSheetOpen} onClose={handleCloseCameraActionSheet}>
          <div className={style.cameraActionSheetContainer}>
            <h2 className={`${style.cameraActionSheetTitle} typo-title2`}>무엇을 촬영할까요?</h2>
            <div>
              <button
                type="button"
                onClick={handleNavigateMenuBoardCamera}
                className={style.cameraActionSheetButton}
              >
                <p className={`typo-label2`}>메뉴판 찍기</p>
              </button>

              <div className="divider" />

              <button
                type="button"
                className={style.cameraActionSheetButton}
                onClick={handleNavigateFoodCamera}
              >
                <p className={`typo-label2`}>음식 찍기</p>
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function OnboardingTargetFrame({
  activeTarget,
  children,
  renderBubble,
  target,
}: {
  activeTarget?: HomeOnboardingTarget | null;
  children: ReactNode;
  renderBubble?: (target: HomeOnboardingTarget) => ReactNode;
  target: HomeOnboardingTarget;
}) {
  const isActive = activeTarget === target;

  return (
    <div
      className={[style.menuCardFrame, isActive ? style.onboardingTargetActive : ""]
        .filter(Boolean)
        .join(" ")}
      data-home-onboarding-target={target}
    >
      {isActive ? renderBubble?.(target) : null}
      {children}
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
  onClick?: () => void;
  type?: string;
}) {
  return (
    <ActionCard onClick={onClick} className={type === "camera" ? style.bgPrimary : ""}>
      <div className={style.menuCardContainer}>
        <p className={`typo-title4 ${type === "camera" ? style.textWhite : ""}`}>{title}</p>
        <p
          className={`${style.description} ${type === "camera" ? style.textWhite : ""} typo-body3`}
        >
          {description}
        </p>
        <div className={style.iconContainer}>
          <img src={iconSrc} alt={`${title} 아이콘`} className={style.iconSize} />
        </div>
      </div>
    </ActionCard>
  );
}
