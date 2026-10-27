import styles from "@/features/calendar/styles/DayCell.module.css";

import type { DayCellRenderProps } from "../types/calendar.types";
import { formatDayNumber } from "../utils/format";

type Props = DayCellRenderProps & {
  hasRecord: boolean;
  showMonthBackground?: boolean;
  recordLabel?: string;
  recordTypeLabel?: string;
};

export default function DayCell({
  day,
  weekdayLabel,
  onSelect,
  variant = "week",
  hasRecord,
  showMonthBackground = false,
  recordLabel,
  recordTypeLabel = "식사",
}: Props) {
  const button = (
    <button
      type="button"
      className={styles.root}
      data-view={variant}
      data-month-background={showMonthBackground}
      data-selected={day.isSelected}
      data-today={day.isToday}
      data-outside={!day.isCurrentMonth}
      data-has-record={hasRecord}
      onClick={() => onSelect(day.date)}
      aria-pressed={day.isSelected}
      aria-label={`${day.date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}${hasRecord ? `, ${recordTypeLabel} 기록 있음${recordLabel ? `, ${recordLabel}` : ""}` : ""}`}
    >
      {variant === "week" && weekdayLabel && (
        <span className="caption-m-regular">{weekdayLabel}</span>
      )}
      <div className={styles.numberContainer}>
        <span className="body-l-regular">{formatDayNumber(day.date)}</span>
        {/* <EventDot visible={hasRecord} variant={variant} isOutside={!day.isCurrentMonth} /> */}
      </div>
    </button>
  );

  return variant === "month" ? (
    <div className={styles.cell}>
      {button}
      <span className={`${styles.recordValue} caption-s-medium text-tertiary`} aria-hidden="true">
        {recordLabel}
      </span>
    </div>
  ) : (
    button
  );
}
