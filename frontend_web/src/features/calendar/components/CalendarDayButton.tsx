import type { ComponentPropsWithoutRef } from "react";

import styles from "@/features/calendar/styles/CalendarDayButton.module.css";
import type { DayCellRenderProps } from "@/features/calendar/types/calendar.types";
import { formatDayNumber } from "@/features/calendar/utils/format";

type Props = DayCellRenderProps &
  Omit<ComponentPropsWithoutRef<"button">, "onSelect" | "onClick" | "type">;

/** 기본 날짜 버튼. children으로 값 표시를 추가하거나 renderDayCell로 버튼 전체를 교체한다. */
export default function CalendarDayButton({
  day,
  weekdayLabel,
  onSelect,
  variant = "month",
  className,
  children,
  ...buttonProps
}: Props) {
  const dateLabel = day.date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-view={variant}
      data-selected={day.isSelected}
      data-today={day.isToday}
      data-outside={!day.isCurrentMonth}
      aria-pressed={day.isSelected}
      aria-current={day.isToday ? "date" : undefined}
      aria-label={`${dateLabel}${day.isToday ? ", 오늘" : ""}`}
      {...buttonProps}
      onClick={() => onSelect(day.date)}
    >
      {variant === "week" && weekdayLabel && (
        <span className={styles.weekday}>{weekdayLabel}</span>
      )}
      {children ?? formatDayNumber(day.date)}
    </button>
  );
}
