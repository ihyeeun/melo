import { Fragment, type ReactNode, useCallback, useLayoutEffect, useRef } from "react";

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

export default function MonthlyCalendar({
  pages,
  currentPageIndex,
  onSelectDate,
  onSwipePrev,
  onSwipeNext,
  renderDayCell,
}: Props) {
  const currentPageRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className={styles.month}>
      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekday}>
            {label}
          </div>
        ))}
      </div>

      <div
        ref={viewportRef}
        className={`${styles.pager} ${styles.monthViewport}`}
        role="group"
        aria-label="월간 달력"
        onScroll={handleScroll}
      >
        <div className={styles.track}>
          {pages.map((days, pageIndex) => {
            const isCurrentPage = pageIndex === currentPageIndex;
            const pageKey = days[0]?.date.toISOString() ?? String(pageIndex);

            return (
              <div
                ref={isCurrentPage ? currentPageRef : undefined}
                key={pageKey}
                className={`${styles.page} ${styles.monthGrid}`}
                aria-hidden={!isCurrentPage}
                inert={!isCurrentPage}
              >
                {days.map((day) => {
                  const props: DayCellRenderProps = {
                    day,
                    onSelect: onSelectDate,
                    variant: "month",
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
    </div>
  );
}
