import EventDot from "@/features/calendar/components/EventDot";

import type { CalendarDay } from "../types/calendar.types";
import { formatDayNumber } from "../utils/format";

type DayCellVariant = "week" | "month";

type Props = {
  day: CalendarDay;
  weekdayLabel?: string;
  onSelect: (date: Date) => void;
  variant?: DayCellVariant;
};

export default function DayCell({ day, weekdayLabel, onSelect, variant = "week" }: Props) {
  const classNames = [
    "calendar-day-cell",
    `calendar-day-cell--${variant}`,
    day.isSelected ? "is-selected" : "",
    day.isToday ? "is-today" : "",
    !day.isCurrentMonth ? "is-outside" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onSelect(day.date)}
      aria-pressed={day.isSelected}
      aria-label={`${day.date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}`}
    >
      {variant === "week" && weekdayLabel && (
        <div className="calendar-day-weekday-container">
          <span className="calendar-day-weekday typo-title4">{weekdayLabel}</span>
        </div>
      )}
      <div className="calendar-day-number-container">
        <span className="calendar-day-number typo-title4">{formatDayNumber(day.date)}</span>
        {variant === "month" ? <EventDot visible={day.hasRecord} /> : null}
      </div>
    </button>
  );
}
