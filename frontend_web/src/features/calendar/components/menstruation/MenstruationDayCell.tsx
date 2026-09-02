import type { DayCellRenderProps } from "@/features/calendar/components/dayCell";
import styles from "@/features/calendar/styles/MenstruationDayCell.module.css";
import type { MenstrualStatus } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";

import { formatDayNumber } from "../../utils/format";

type Props = DayCellRenderProps & {
  menstruationType: MenstrualStatus | null;
};

export default function MenstruationDayCell({
  day,
  menstruationType,
  weekdayLabel,
  onSelect,
  variant = "week",
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

  return (
    <button
      type="button"
      className={classNames}
      data-menstruation={menstruationType}
      onClick={() => onSelect(day.date)}
      aria-pressed={day.isSelected}
      aria-current={day.isToday ? "date" : undefined}
      aria-label={`${day.date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}`}
    >
      {variant === "week" && weekdayLabel && (
        <span className="calendar-day-weekday caption-m-regular">{weekdayLabel}</span>
      )}

      <div className={`calendar-day-number-container ${styles.numberContainer}`}>
        <span className="calendar-day-number body-l-regular">{formatDayNumber(day.date)}</span>
      </div>
    </button>
  );
}
