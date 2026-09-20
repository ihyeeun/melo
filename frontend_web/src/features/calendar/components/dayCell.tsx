import EventDot from "@/features/calendar/components/EventDot";
import styles from "@/features/calendar/styles/DayCell.module.css";

import type { DayCellRenderProps } from "../types/calendar.types";
import { formatDayNumber } from "../utils/format";

type Props = DayCellRenderProps & {
  hasRecord: boolean;
  showMonthBackground?: boolean;
};

export default function DayCell({
  day,
  weekdayLabel,
  onSelect,
  variant = "week",
  hasRecord,
  showMonthBackground = false,
}: Props) {
  return (
    <button
      type="button"
      className={styles.root}
      data-view={variant}
      data-month-background={showMonthBackground}
      data-selected={day.isSelected}
      data-today={day.isToday}
      data-outside={!day.isCurrentMonth}
      onClick={() => onSelect(day.date)}
      aria-pressed={day.isSelected}
      aria-label={`${day.date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}${hasRecord ? ", 식사 기록 있음" : ""}`}
    >
      {variant === "week" && weekdayLabel && (
        <span className="caption-m-regular">{weekdayLabel}</span>
      )}
      <div className={styles.numberContainer}>
        <span className="body-l-regular">{formatDayNumber(day.date)}</span>
        <EventDot visible={hasRecord} variant={variant} isOutside={!day.isCurrentMonth} />
      </div>
    </button>
  );
}
