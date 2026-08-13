import HomeContent from "@/features/home/components/HomeContent";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { parseDateKey } from "@/shared/utils/dateFormat";

export default function HomePage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  return (
    <HomeContent
      selectedDate={selectedDate}
      selectedDateKey={selectedDateKey}
      onSelectDate={setSelectedDate}
    />
  );
}
