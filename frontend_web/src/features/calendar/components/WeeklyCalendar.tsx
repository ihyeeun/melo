import { Fragment, type ReactNode, useCallback } from "react";

import styles from "@/features/calendar/styles/Calendar.module.css";
import type { CalendarDay, DayCellRenderProps } from "@/features/calendar/types/calendar.types";

import { useCalendarPager } from "../hooks/useCalendarPager";
import { WEEKDAY_LABELS } from "../utils/format";

type Props = {
  pages: CalendarDay[][];
  currentPageIndex: number;
  onSelectDate: (date: Date) => void;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  renderDayCell: (props: DayCellRenderProps) => ReactNode;
};

export default function WeeklyCalendar({
  pages,
  currentPageIndex,
  onSelectDate,
  onSwipePrev,
  onSwipeNext,
  renderDayCell,
}: Props) {
  const currentPageKey = pages[currentPageIndex]?.[0]?.date.toISOString() ?? "";

  const handlePageChange = useCallback(
    (pageIndex: number) => {
      if (pageIndex < currentPageIndex) {
        onSwipePrev();
      }

      if (pageIndex > currentPageIndex) {
        onSwipeNext();
      }
    },
    [currentPageIndex, onSwipeNext, onSwipePrev],
  );

  const { handleScroll, viewportRef } = useCalendarPager({
    currentPageIndex,
    currentPageKey,
    onPageChange: handlePageChange,
    pageCount: pages.length,
  });

  return (
    <div
      ref={viewportRef}
      className={styles.pager}
      role="group"
      aria-label="주간 달력"
      onScroll={handleScroll}
    >
      <div className={styles.track}>
        {pages.map((days, pageIndex) => {
          const isCurrentPage = pageIndex === currentPageIndex;
          const pageKey = days[0]?.date.toISOString() ?? String(pageIndex);

          return (
            <div
              key={pageKey}
              className={`${styles.page} ${styles.weekGrid}`}
              aria-hidden={!isCurrentPage}
              inert={!isCurrentPage}
            >
              {days.map((day, dayIndex) => {
                const props: DayCellRenderProps = {
                  day,
                  weekdayLabel: WEEKDAY_LABELS[dayIndex],
                  onSelect: onSelectDate,
                  variant: "week",
                };

                return (
                  <Fragment key={day.date.toISOString()}>
                    {renderDayCell(props)}
                  </Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
