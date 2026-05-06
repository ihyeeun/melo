import { useNavigate } from "react-router-dom";

import ActionCard from "@/features/home/components/cards/ActionCard";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import style from "@/features/home/styles/MenuActionSection.module.css";
import { PATH } from "@/router/path";
import { syncAppTab } from "@/shared/api/bridge/nativeBridge";

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

  return (
    <div className={style.content}>
      <div className={style.menuContainer}>
        {showMenuBoardCameraCard ? (
          <div data-home-onboarding-target="menu-board-camera">
            <MenuCard
              title={"메뉴판 촬영하기"}
              description="식당 메뉴판이나 배달 앱 스크린샷도 좋아요"
              iconSrc="/icons/camera-icon.svg"
              onClick={() => {
                navigate(PATH.MENU_BOARD_CAMERA, {
                  state: {
                    autoOpenCamera: true,
                  },
                });
              }}
              type="camera"
            />
          </div>
        ) : null}
        {showChatCard ? (
          <div data-home-onboarding-target="chat">
            <MenuCard
              title={"AI 코치"}
              description="오늘의 식단 고민을 해결해드려요"
              iconSrc="/icons/chat-icon.svg"
              onClick={() => {
                syncAppTab("chat");
                navigate(PATH.CHAT);
              }}
            />
          </div>
        ) : null}
      </div>

      <TodayBodyLogSection date={selectedDate} />
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
        <p className={`${type === "camera" ? style.textWhite : style.description} typo-body4`}>
          {description}
        </p>
        <div className={style.iconContainer}>
          <img src={iconSrc} alt={`${title} 아이콘`} className={style.iconSize} />
        </div>
      </div>
    </ActionCard>
  );
}
