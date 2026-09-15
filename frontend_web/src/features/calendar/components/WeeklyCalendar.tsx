import { Fragment, type ReactNode, useCallback } from "react";

import type { DayCellRenderProps } from "@/features/calendar/components/dayCell";
import DayCell from "@/features/calendar/components/dayCell";

import { useCalendarPager } from "../hooks/useCalendarPager";
import type { CalendarDay } from "../types/calendar.types";
import { WEEKDAY_LABELS } from "../utils/format";

type Props = {
  pages: CalendarDay[][];
  currentPageIndex: number;
  onSelectDate: (date: Date) => void;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  renderDayCell?: (props: DayCellRenderProps) => ReactNode;
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
      className="calendar-pager weekly-calendar"
      role="group"
      aria-label="주간 달력"
      onScroll={handleScroll}
    >
      <div className="calendar-pager-track">
        {pages.map((days, pageIndex) => {
          const isCurrentPage = pageIndex === currentPageIndex;
          const pageKey = days[0]?.date.toISOString() ?? String(pageIndex);

          return (
            <div
              key={pageKey}
              className="calendar-pager-page weekly-calendar-page"
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
                    {renderDayCell ? renderDayCell(props) : <DayCell {...props} />}
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
