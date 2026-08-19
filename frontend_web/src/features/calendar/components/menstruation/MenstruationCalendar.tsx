import { isSameDay, isSameMonth, isToday } from "date-fns";
import { useState } from "react";

import { useMonthCalendar } from "@/features/calendar/hooks/useCalendar";
import styles from "@/features/calendar/styles/MenstruationCalendar.module.css";
import { WEEKDAY_LABELS } from "@/features/calendar/types/calendar.types";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

export default function MenstruationCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>();

  const { viewDate, visibleDates, goPrevMonth, goNextMonth, goToday, goToMonth } =
    useMonthCalendar();

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);

    // 앞뒤 달의 날짜를 누르면 해당 월로 이동
    if (!isSameMonth(date, viewDate)) {
      goToMonth(date);
    }
  };

  return (
    <section className={styles.calendar}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.navigationButton}
          onClick={goPrevMonth}
          aria-label="이전 달"
        >
          <SystemIcon name="arrow-filled-left" size={24} />
        </button>

        <button
          type="button"
          className={`body-l-medium text-primary textCenter`}
          onClick={goToday}
          aria-label="이번 달로 이동"
        >
          {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
        </button>

        <button
          type="button"
          className={styles.navigationButton}
          onClick={goNextMonth}
          aria-label="다음 달"
        >
          <SystemIcon name="arrow-filled-right" size={24} />
        </button>
      </header>

      <>
        <div className={styles.weekdays} aria-hidden="true">
          {WEEKDAY_LABELS.map((weekday) => (
            <span key={weekday} className={`${styles.weekday} caption-m-semi textCenter`}>
              {weekday}
            </span>
          ))}
        </div>

        <div className={styles.grid} role="grid" aria-label="월경 기록 달력">
          {visibleDates.map((date) => {
            const today = isToday(date);
            const selected = selectedDate ? isSameDay(date, selectedDate) : false;
            const outside = !isSameMonth(date, viewDate);

            return (
              <button
                key={date.getTime()}
                type="button"
                className={styles.day}
                onClick={() => handleSelectDate(date)}
                data-today={today}
                data-selected={selected}
                data-outside={outside}
                aria-pressed={selected}
                aria-current={today ? "date" : undefined}
                aria-label={date.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              >
                <span className={`body-l-medium`}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </>
    </section>
  );
}
