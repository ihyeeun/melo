import HomeContent from "@/features/home/components/HomeContent";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { parseDateKey } from "@/shared/utils/dateFormat";

export default function HomePage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const isMenuBoardCameraBlocked = useIsFeatureBlocked(FEATURE_GUARD.MENU_BOARD_CAMERA);
  const isChatBlocked = useIsFeatureBlocked(FEATURE_GUARD.CHAT);
  const showMenuBoardCameraCard = !isMenuBoardCameraBlocked;
  const showChatCard = !isChatBlocked;

  return (
    <HomeContent
      selectedDate={selectedDate}
      selectedDateKey={selectedDateKey}
      onSelectDate={setSelectedDate}
      showMenuBoardCameraCard={showMenuBoardCameraCard}
      showChatCard={showChatCard}
    />
  );
}
