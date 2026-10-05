import styles from "@/features/calendar/styles/MenstruationDayCell.module.css";
import type { DayCellRenderProps } from "@/features/calendar/types/calendar.types";
import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import { formatDateKey, isFutureDateKey } from "@/shared/utils/dateFormat";

import { formatDayNumber } from "../../utils/format";

type Props = DayCellRenderProps & {
  menstruationType: MenstrualStatus | null;
  selectionMode?: "single" | "multiple";
  showMonthBackground?: boolean;
};

export default function MenstruationDayCell({
  day,
  menstruationType,
  weekdayLabel,
  onSelect,
  variant = "week",
  selectionMode = "single",
  showMonthBackground = false,
}: Props) {
  const recordLabel = menstruationType === "menstrual_recorded"
    ? ", 생리 기록 있음"
    : menstruationType === "next_predicted"
      ? ", 월경 예상 시작일"
      : "";

  return (
    <button
      type="button"
      className={styles.root}
      data-view={variant}
      data-month-background={showMonthBackground}
      data-selected={day.isSelected}
      data-today={day.isToday}
      data-outside={!day.isCurrentMonth}
      data-menstruation={menstruationType}
      data-selection-mode={selectionMode}
      data-future={isFutureDateKey(formatDateKey(day.date))}
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
        <span className="caption-m-regular">{weekdayLabel}</span>
      )}

      <div className={styles.numberContainer}>
        <span className="body-l-medium">{formatDayNumber(day.date)}</span>
      </div>
    </button>
  );
}
