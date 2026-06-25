import { type ReactNode, useState } from "react";

import { ChatCameraUpdateRequiredModal } from "@/features/camera/components/ChatCameraUpdateRequiredModal";
import { navigateToChatCameraIfSupported } from "@/features/camera/utils/chatCameraSupport";
import ActionCard from "@/features/home/components/cards/ActionCard";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import type { HomeOnboardingTarget } from "@/features/home/constants/homeOnboarding";
import style from "@/features/home/styles/MenuActionSection.module.css";
import { PATH } from "@/router/path";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
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
              iconSrc="/icons/camera-icon.svg"
              onClick={disableInteractions ? undefined : handleNavigateChatCamera}
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
  description?: string;
  iconSrc: string;
  onClick?: () => void;
  type?: string;
}) {
  return (
    <ActionCard onClick={onClick} className={type === "camera" ? style.bgPrimary : ""}>
      <div className={style.menuCardContainer}>
        <p
          className={`${style.description} ${type === "camera" ? style.textWhite : ""} typo-body3`}
        >
          {description}
        </p>

        <img src={iconSrc} alt={`${title} 아이콘`} width={56} height={56} />
        <p className={`typo-title4 ${type === "camera" ? style.textWhite : ""}`}>{title}</p>
      </div>
    </ActionCard>
  );
}
