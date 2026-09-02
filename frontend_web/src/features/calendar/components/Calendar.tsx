import "@/features/calendar/styles/calendar.css";

import { addMonths, addWeeks, startOfMonth, subMonths, subWeeks } from "date-fns";
import { type ReactNode, useEffect, useMemo } from "react";

import CalendarHeader from "@/features/calendar/components/CalendarHeader";
import type { DayCellRenderProps } from "@/features/calendar/components/dayCell";
import MonthlyCalendar from "@/features/calendar/components/MonthlyCalendar";
import WeeklyCalendar from "@/features/calendar/components/WeeklyCalendar";
import { formatDateKey } from "@/shared/utils/dateFormat";

import { useCalendarRecordedDatesQuery } from "../hooks/queries/useCalendarRecordedDatesQuery";
import { useCalendar } from "../hooks/useCalendar";
import { buildMonthCalendarDays, buildWeekCalendarDays } from "../utils/calendar";

type Props = {
  headerAction?: ReactNode;
  initialDate?: Date;
  recordedDates?: string[];
  onSelectDate?: (date: Date) => void;
  onVisibleStartDateChange?: (dateKey: string) => void;
  safeAreaTop?: boolean;
  selectedDate?: Date;
  showMonthBackground?: boolean;
  showRecordedDots?: boolean;
  renderDayCell?: (props: DayCellRenderProps) => ReactNode;
};

const EMPTY_RECORDED_DATES: string[] = [];

export default function Calendar({
  headerAction,
  initialDate,
  recordedDates: fallbackRecordedDates = EMPTY_RECORDED_DATES,
  onSelectDate,
  onVisibleStartDateChange,
  safeAreaTop = true,
  selectedDate: controlledSelectedDate,
  showMonthBackground = true,
  showRecordedDots = true,
  renderDayCell,
}: Props) {
  const {
    viewMode,
    selectedDate,
    viewDate,
    weekDays,
    canGoNextWeek,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  } = useCalendar({
    initialDate,
    initialViewMode: "week",
    recordedDates: showRecordedDots ? fallbackRecordedDates : EMPTY_RECORDED_DATES,
    selectedDate: controlledSelectedDate,
  });

  const monthDateRange = useMemo(() => {
    const startDate = startOfMonth(viewDate);

    return {
      startDate: formatDateKey(subMonths(startDate, 1)),
      endDate: formatDateKey(addMonths(startDate, 2)),
    };
  }, [viewDate]);

  const { recordedDates } = useCalendarRecordedDatesQuery({
    enabled: showRecordedDots && viewMode === "month",
    startDate: monthDateRange.startDate,
    endDate: monthDateRange.endDate,
  });

  const displayedMonthPages = useMemo(() => {
    const monthlyRecordedDates = showRecordedDots ? recordedDates : EMPTY_RECORDED_DATES;

    return [subMonths(viewDate, 1), viewDate, addMonths(viewDate, 1)].map((baseDate) =>
      buildMonthCalendarDays({
        baseDate,
        selectedDate,
        recordedDates: monthlyRecordedDates,
        weekStartsOn: 1,
      }),
    );
  }, [recordedDates, selectedDate, showRecordedDots, viewDate]);

  const displayedWeekPages = useMemo(() => {
    const weeklyRecordedDates = showRecordedDots ? fallbackRecordedDates : EMPTY_RECORDED_DATES;
    // 과거 주는 계속 탐색할 수 있으므로 이전 주를 항상 렌더링한다. 현재 주를
    // 가운데 인덱스(1)에 고정해 pager 재정렬과 inert 상태를 일관되게 유지한다.
    const pages = [
      buildWeekCalendarDays({
        baseDate: subWeeks(viewDate, 1),
        selectedDate,
        recordedDates: weeklyRecordedDates,
        weekStartsOn: 1,
      }),
    ];

    pages.push(weekDays);

    if (canGoNextWeek) {
      pages.push(
        buildWeekCalendarDays({
          baseDate: addWeeks(viewDate, 1),
          selectedDate,
          recordedDates: weeklyRecordedDates,
          weekStartsOn: 1,
        }),
      );
    }

    return pages;
  }, [
    canGoNextWeek,
    fallbackRecordedDates,
    selectedDate,
    showRecordedDots,
    viewDate,
    weekDays,
  ]);

  const currentWeekPageIndex = 1;

  const visibleStartDateKey = useMemo(() => {
    const pages = viewMode === "month" ? displayedMonthPages : displayedWeekPages;
    const firstRenderedDate = pages[0]?.[0]?.date;
    return firstRenderedDate ? formatDateKey(firstRenderedDate) : null;
  }, [displayedMonthPages, displayedWeekPages, viewMode]);

  useEffect(() => {
    if (!visibleStartDateKey) return;
    onVisibleStartDateChange?.(visibleStartDateKey);
  }, [onVisibleStartDateChange, visibleStartDateKey]);

  const handleSelectDateInWeek = (date: Date) => {
    selectDate(date);
    onSelectDate?.(date);
  };

  const handleSelectDateInMonth = (date: Date) => {
    selectDate(date, { switchToWeek: true });
    onSelectDate?.(date);
  };

  const handleGoToday = () => {
    const today = goToday();
    onSelectDate?.(today);
  };

  return (
    <section
      className={`calendar-root is-${viewMode}${safeAreaTop ? " has-safe-area-top" : ""}${showMonthBackground ? " has-month-background" : ""}`}
    >
      <CalendarHeader
        viewMode={viewMode}
        viewDate={viewDate}
        selectedDate={selectedDate}
        onToggleViewMode={toggleViewMode}
        onPrev={goPrev}
        onNext={goNext}
        onToday={handleGoToday}
        headerAction={headerAction}
      />

      <div className="calendar-body">
        {viewMode === "week" ? (
          <WeeklyCalendar
            pages={displayedWeekPages}
            currentPageIndex={currentWeekPageIndex}
            onSelectDate={handleSelectDateInWeek}
            onSwipePrev={goPrev}
            onSwipeNext={goNext}
            renderDayCell={renderDayCell}
          />
        ) : (
          <MonthlyCalendar
            pages={displayedMonthPages}
            currentPageIndex={1}
            onSelectDate={handleSelectDateInMonth}
            onSwipePrev={goPrev}
            onSwipeNext={goNext}
            renderDayCell={renderDayCell}
          />
        )}
      </div>
    </section>
  );
}
