import type { DayCellRenderProps } from "@/features/calendar/components/dayCell";
import styles from "@/features/calendar/styles/MenstruationDayCell.module.css";
import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";

import { formatDayNumber } from "../../utils/format";

type Props = DayCellRenderProps & {
  menstruationType: MenstrualStatus | null;
  selectionMode?: "single" | "multiple";
};

export default function MenstruationDayCell({
  day,
  menstruationType,
  weekdayLabel,
  onSelect,
  variant = "week",
  selectionMode = "single",
}: Props) {
  const classNames = [
    "calendar-day-cell",
    `calendar-day-cell--${variant}`,
    styles.root,
    styles[variant],
    day.isSelected ? `is-selected ${styles.selected}` : "",
    day.isToday ? "is-today" : "",
    !day.isCurrentMonth ? `is-outside ${styles.outside}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const recordLabel = menstruationType === "menstrual_recorded"
    ? ", 생리 기록 있음"
    : menstruationType === "next_predicted"
      ? ", 다음 월경 예상일"
      : "";

  return (
    <button
      type="button"
      className={classNames}
      data-menstruation={menstruationType}
      data-selection-mode={selectionMode}
      onClick={() => onSelect(day.date)}
      aria-pressed={day.isSelected}
      aria-current={day.isToday ? "date" : undefined}
      aria-label={`${day.date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}${recordLabel}`}
    >
      {variant === "week" && weekdayLabel && (
        <span className="calendar-day-weekday caption-m-regular">{weekdayLabel}</span>
      )}

      <div className={`calendar-day-number-container ${styles.numberContainer}`}>
        <span className="calendar-day-number body-l-medium">{formatDayNumber(day.date)}</span>
      </div>
    </button>
  );
}
