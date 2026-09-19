import EventDot from "@/features/calendar/components/EventDot";

import type { CalendarDay, ViewMode } from "../types/calendar.types";
import { formatDayNumber } from "../utils/format";

export type DayCellRenderProps = {
  day: CalendarDay;
  weekdayLabel?: string;
  onSelect: (date: Date) => void;
  variant?: ViewMode;
};

export default function DayCell({
  day,
  weekdayLabel,
  onSelect,
  variant = "week",
}: DayCellRenderProps) {
  return (
    <button
      type="button"
      className="calendar-day-cell"
      data-kind="default"
      data-view={variant}
      data-selected={day.isSelected}
      data-today={day.isToday}
      data-outside={!day.isCurrentMonth}
      onClick={() => onSelect(day.date)}
      aria-pressed={day.isSelected}
      aria-label={`${day.date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}${day.hasRecord ? ", 식사 기록 있음" : ""}`}
    >
      {variant === "week" && weekdayLabel && (
        <span className="calendar-day-weekday caption-m-regular">{weekdayLabel}</span>
      )}
      <div className="calendar-day-number-container">
        <span className="calendar-day-number body-l-regular">{formatDayNumber(day.date)}</span>
        <EventDot visible={day.hasRecord} />
      </div>
    </button>
  );
}
