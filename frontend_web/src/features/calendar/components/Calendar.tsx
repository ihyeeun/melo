import "@/features/calendar/styles/calendar.css";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
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
    canGoNextWeek,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  } = useCalendar({
    initialDate,
    initialViewMode: "week",
    selectedDate: controlledSelectedDate,
  });

  const recordedDateRange = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    // 주·월 전환 시 같은 조회 결과를 사용하고, 인접 월의 바깥 날짜 칸까지 포함한다.
    const firstDate = startOfWeek(subMonths(monthStart, 1), { weekStartsOn: 1 });
    const lastDate = endOfWeek(endOfMonth(addMonths(monthStart, 1)), { weekStartsOn: 1 });

    return {
      startDate: formatDateKey(firstDate),
      endDate: formatDateKey(addDays(lastDate, 1)),
    };
  }, [viewDate]);

  const { data: fetchedRecordedDates } = useCalendarRecordedDatesQuery({
    enabled: showRecordedDots,
    startDate: recordedDateRange.startDate,
    endDate: recordedDateRange.endDate,
  });
  const recordedDates = showRecordedDots
    ? (fetchedRecordedDates ?? fallbackRecordedDates)
    : EMPTY_RECORDED_DATES;

  const displayedMonthPages = useMemo(() => {
    return [subMonths(viewDate, 1), viewDate, addMonths(viewDate, 1)].map((baseDate) =>
      buildMonthCalendarDays({
        baseDate,
        selectedDate,
        recordedDates,
        weekStartsOn: 1,
      }),
    );
  }, [recordedDates, selectedDate, viewDate]);

  const displayedWeekPages = useMemo(() => {
    // 과거 주는 계속 탐색할 수 있으므로 이전 주를 항상 렌더링한다. 현재 주를
    // 가운데 인덱스(1)에 고정해 pager 재정렬과 inert 상태를 일관되게 유지한다.
    const baseDates = [subWeeks(viewDate, 1), viewDate];

    if (canGoNextWeek) {
      baseDates.push(addWeeks(viewDate, 1));
    }

    return baseDates.map((baseDate) =>
      buildWeekCalendarDays({
        baseDate,
        selectedDate,
        recordedDates,
        weekStartsOn: 1,
      }),
    );
  }, [canGoNextWeek, recordedDates, selectedDate, viewDate]);

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
      className="calendar-root"
      data-view={viewMode}
      data-safe-area-top={safeAreaTop}
      data-month-background={showMonthBackground}
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
