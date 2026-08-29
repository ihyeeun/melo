import { addMonths, isSameDay, isSameMonth, isToday, subMonths } from "date-fns";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useMonthCalendar } from "@/features/calendar/hooks/useCalendar";
import { useCalendarPager } from "@/features/calendar/hooks/useCalendarPager";
import styles from "@/features/calendar/styles/MenstruationCalendar.module.css";
import { WEEKDAY_LABELS } from "@/features/calendar/types/calendar.types";
import { getMonthDates } from "@/features/calendar/utils/calendar";
import { useGetMenstruationCyclesQuery } from "@/features/menstruation/hooks/queries/menstruation.query";
import { calculateMenstrualPhaseDates } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import {
  calculateMenstrualCalendar,
  getMenstruationDateType,
} from "@/features/menstruation/utils/menstruation.util";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { formatDateKey, getTodayFormatDateKey } from "@/shared/utils/dateFormat";

interface CalendarProps {
  onSelectedDate?: (date: string) => void;
}

export default function MenstruationCalendar({ onSelectedDate }: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const currentPageRef = useRef<HTMLDivElement>(null);
  const today = getTodayFormatDateKey();
  const { data: menstruationData } = useGetMenstruationCyclesQuery({
    date: today,
    enabled: true,
  });
  const menstrualCalculateDates = calculateMenstrualPhaseDates(menstruationData?.cycles ?? []);
  console.log(menstrualCalculateDates);
  const menstrualDate = calculateMenstrualCalendar(menstruationData?.cycles ?? []);
  const { viewDate, goPrevMonth, goNextMonth, goToday, goToMonth } = useMonthCalendar();
  const monthPages = useMemo(
    () =>
      [subMonths(viewDate, 1), viewDate, addMonths(viewDate, 1)].map((baseDate) => ({
        baseDate,
        dates: getMonthDates(baseDate, 1),
      })),
    [viewDate],
  );
  const currentPageIndex = 1;
  const currentPageKey = formatDateKey(viewDate);

  const handlePageChange = useCallback(
    (pageIndex: number) => {
      if (pageIndex < currentPageIndex) {
        goPrevMonth();
      }

      if (pageIndex > currentPageIndex) {
        goNextMonth();
      }
    },
    [goNextMonth, goPrevMonth],
  );

  const { handleScroll, viewportRef } = useCalendarPager({
    currentPageIndex,
    currentPageKey,
    onPageChange: handlePageChange,
    pageCount: monthPages.length,
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const currentPage = currentPageRef.current;

    if (!viewport || !currentPage) return;

    const fitCurrentPageHeight = () => {
      viewport.style.height = `${currentPage.offsetHeight}px`;
    };

    fitCurrentPageHeight();

    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(fitCurrentPageHeight);
    resizeObserver.observe(currentPage);

    return () => resizeObserver.disconnect();
  }, [currentPageKey, viewportRef]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);

    onSelectedDate?.(formatDateKey(date));

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

        <div
          ref={viewportRef}
          className={styles.viewport}
          role="group"
          aria-label="월경 기록 달력"
          onScroll={handleScroll}
        >
          <div className={styles.track}>
            {monthPages.map(({ baseDate, dates }, pageIndex) => {
              const isCurrentPage = pageIndex === currentPageIndex;

              return (
                <div
                  ref={isCurrentPage ? currentPageRef : undefined}
                  key={formatDateKey(baseDate)}
                  className={styles.grid}
                  role="grid"
                  aria-hidden={!isCurrentPage}
                  inert={!isCurrentPage}
                >
                  {dates.map((date) => {
                    const dateKey = formatDateKey(date);
                    const today = isToday(date);
                    const selected = selectedDate ? isSameDay(date, selectedDate) : today;
                    const outside = !isSameMonth(date, baseDate);
                    const menstruationType = getMenstruationDateType(
                      dateKey,
                      menstrualDate?.calendar,
                    );

                    return (
                      <button
                        key={date.getTime()}
                        type="button"
                        className={styles.day}
                        onClick={() => handleSelectDate(date)}
                        data-today={today}
                        data-selected={selected}
                        data-outside={outside}
                        data-menstruation={menstruationType}
                        aria-pressed={selected}
                        aria-current={today ? "date" : undefined}
                        aria-label={date.toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        })}
                      >
                        <span className="body-l-medium">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </>
    </section>
  );
}
