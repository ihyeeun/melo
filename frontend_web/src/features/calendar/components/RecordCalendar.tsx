import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { type ReactNode, useMemo } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import CalendarHeader from "@/features/calendar/components/CalendarHeader";
import DayCell from "@/features/calendar/components/dayCell";
import styles from "@/features/calendar/styles/RecordCalendar.module.css";
import type { DayCellRenderProps } from "@/features/calendar/types/calendar.types";
import { formatDateKey } from "@/shared/utils/dateFormat";

import { useCalendarRecordedDatesQuery } from "../hooks/queries/useCalendarRecordedDatesQuery";
import { useCalendar } from "../hooks/useCalendar";

type RecordDayCellRenderProps = DayCellRenderProps & {
  showMonthBackground: boolean;
};

type Props = {
  onSelectDate?: (date: Date) => void;
  onVisibleStartDateChange?: (dateKey: string) => void;
  safeAreaTop?: boolean;
  selectedDate?: Date;
  showMonthBackground?: boolean;
  showRecordedDots?: boolean;
  renderDayCell?: (props: RecordDayCellRenderProps) => ReactNode;
};

const EMPTY_RECORDED_DATES: string[] = [];

/** 기존 기록 화면의 조회·디자인·주간 전환 정책을 조합한다. */
export default function RecordCalendar({
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
    setViewMode,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  } = useCalendar({
    initialViewMode: "week",
    selectedDate: controlledSelectedDate,
    allowFutureWeekNavigation: false,
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
    ? (fetchedRecordedDates ?? EMPTY_RECORDED_DATES)
    : EMPTY_RECORDED_DATES;

  const recordedDateSet = useMemo(() => new Set(recordedDates), [recordedDates]);

  const handleSelectDate = (date: Date) => {
    selectDate(date);
    setViewMode("week");
    onSelectDate?.(date);
  };

  const handleGoToday = () => {
    const today = goToday();
    onSelectDate?.(today);
  };

  return (
    <section
      className={styles.root}
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
      />

      <Calendar
        viewMode={viewMode}
        viewDate={viewDate}
        selectedDate={selectedDate}
        canGoNext={viewMode === "month" || canGoNextWeek}
        onSelectDate={handleSelectDate}
        onPrev={goPrev}
        onNext={goNext}
        onRenderedStartDateChange={onVisibleStartDateChange}
        renderDayCell={(props) => {
          const dayCellProps = { ...props, showMonthBackground };

          return renderDayCell ? (
            renderDayCell(dayCellProps)
          ) : (
            <DayCell {...dayCellProps} hasRecord={recordedDateSet.has(formatDateKey(props.day.date))} />
          );
        }}
      />
    </section>
  );
}
