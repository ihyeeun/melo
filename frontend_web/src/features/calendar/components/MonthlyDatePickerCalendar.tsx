import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "../styles/MonthlyDatePickerCalendar.module.css";
import { getMonthDates } from "../utils/calendar";
import { WEEKDAY_LABELS } from "../utils/format";

type MonthlyDatePickerCalendarProps = {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  initialDate?: Date;
  minDate?: Date;
  maxDate?: Date;
};

function isDateDisabled(date: Date, minDate?: Date, maxDate?: Date) {
  if (minDate && isBefore(date, minDate)) {
    return true;
  }

  if (maxDate && isAfter(date, maxDate)) {
    return true;
  }

  return false;
}

export function MonthlyDatePickerCalendar({
  selectedDate,
  onSelectDate,
  initialDate,
  minDate,
  maxDate,
}: MonthlyDatePickerCalendarProps) {
  const [viewDate, setViewDate] = useState(() => selectedDate ?? initialDate ?? new Date());

  const days = useMemo(() => {
    return getMonthDates(viewDate, 1).map((date) => ({
      date,
      disabled: isDateDisabled(date, minDate, maxDate),
      isCurrentMonth: isSameMonth(date, viewDate),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isToday: isToday(date),
    }));
  }, [maxDate, minDate, selectedDate, viewDate]);

  const monthTitle = format(viewDate, "yyyy년 M월", { locale: ko });

  const handleSelectDate = (date: Date) => {
    if (isDateDisabled(date, minDate, maxDate)) return;

    setViewDate(date);
    onSelectDate(date);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setViewDate((prev) => subMonths(prev, 1))}
          aria-label="이전 달"
        >
          <SystemIcon name="chevron-left-normal" size={24} />
        </button>

        <p className={`${styles.title} typo-title4`}>{monthTitle}</p>

        <button
          type="button"
          className={styles.navButton}
          onClick={() => setViewDate((prev) => addMonths(prev, 1))}
          aria-label="다음 달"
        >
          <SystemIcon name="chevron-right-normal" size={24} />
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={`${styles.weekday} typo-label4`}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((day) => {
          const classNames = [
            styles.dayButton,
            day.isCurrentMonth ? "" : styles.outside,
            day.isSelected ? styles.selected : "",
            day.isToday ? styles.today : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={day.date.toISOString()}
              type="button"
              className={classNames}
              disabled={day.disabled}
              onClick={() => handleSelectDate(day.date)}
              aria-pressed={day.isSelected}
              aria-label={`${day.date.toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}${day.isToday ? ", 오늘" : ""}${!day.isCurrentMonth ? ", 이번 달 아님" : ""}`}
            >
              <span className={`${styles.dayNumber} typo-title4`}>{day.date.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
