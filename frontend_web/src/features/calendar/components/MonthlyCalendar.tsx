import DayCell from "@/features/calendar/components/dayCell";

import { useSwipe } from "../hooks/useSwipe";
import type { CalendarDay } from "../types/calendar.types";
import { WEEKDAY_LABELS } from "../utils/format";

type Props = {
  days: CalendarDay[];
  onSelectDate: (date: Date) => void;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
};

export default function MonthlyCalendar({ days, onSelectDate, onSwipePrev, onSwipeNext }: Props) {
  const { motionStyle, ...swipeHandlers } = useSwipe({
    onSwipeLeft: onSwipeNext,
    onSwipeRight: onSwipePrev,
  });

  return (
    <div className="monthly-calendar" style={motionStyle} {...swipeHandlers}>
      <div className="monthly-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="monthly-calendar-weekday caption-m-semi">
            {label}
          </div>
        ))}
      </div>

      <div className="monthly-calendar-grid">
        {days.map((day) => (
          <DayCell key={day.date.toISOString()} day={day} onSelect={onSelectDate} variant="month" />
        ))}
      </div>
    </div>
  );
}
