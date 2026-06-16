import "@/features/calendar/styles/calendar.css";

import { addMonths, startOfMonth } from "date-fns";
import { useMemo } from "react";

import CalendarHeader from "@/features/calendar/components/CalendarHeader";
import MonthlyCalendar from "@/features/calendar/components/MonthlyCalendar";
import WeeklyCalendar from "@/features/calendar/components/WeeklyCalendar";
import { formatDateKey } from "@/shared/utils/dateFormat";

import { useCalendarRecordedDatesQuery } from "../hooks/queries/useCalendarRecordedDatesQuery";
import { useCalendar } from "../hooks/useCalendar";
import { buildMonthCalendarDays } from "../utils/calendar";

type Props = {
  initialDate?: Date;
  recordedDates?: string[];
  onSelectDate?: (date: Date) => void;
};

const EMPTY_RECORDED_DATES: string[] = [];

export default function Calendar({
  initialDate,
  recordedDates: fallbackRecordedDates = EMPTY_RECORDED_DATES,
  onSelectDate,
}: Props) {
  const {
    viewMode,
    selectedDate,
    viewDate,
    weekDays,
    monthDays,
    toggleViewMode,
    selectDate,
    goPrev,
    goNext,
    goToday,
  } = useCalendar({
    initialDate,
    initialViewMode: "week",
    recordedDates: fallbackRecordedDates,
  });

  const monthDateRange = useMemo(() => {
    const startDate = startOfMonth(viewDate);
    const endDate = addMonths(startDate, 1);

    return {
      startDate: formatDateKey(startDate),
      endDate: formatDateKey(endDate),
    };
  }, [viewDate]);

  const { recordedDates } = useCalendarRecordedDatesQuery({
    enabled: viewMode === "month",
    startDate: monthDateRange.startDate,
    endDate: monthDateRange.endDate,
  });

  const displayedMonthDays = useMemo(() => {
    if (recordedDates.length === 0) return monthDays;

    return buildMonthCalendarDays({
      baseDate: viewDate,
      selectedDate,
      recordedDates,
      weekStartsOn: 1,
    });
  }, [monthDays, recordedDates, selectedDate, viewDate]);

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
    <section className="calendar-root">
      <CalendarHeader
        viewMode={viewMode}
        viewDate={viewDate}
        selectedDate={selectedDate}
        onToggleViewMode={toggleViewMode}
        onPrev={goPrev}
        onNext={goNext}
        onToday={handleGoToday}
      />

      <div className="calendar-body">
        {viewMode === "week" ? (
          <WeeklyCalendar
            days={weekDays}
            onSelectDate={handleSelectDateInWeek}
            onSwipePrev={goPrev}
            onSwipeNext={goNext}
          />
        ) : (
          <MonthlyCalendar
            days={displayedMonthDays}
            onSelectDate={handleSelectDateInMonth}
            onSwipePrev={goPrev}
            onSwipeNext={goNext}
          />
        )}
      </div>
    </section>
  );
}
