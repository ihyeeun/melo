import { addMonths, addWeeks, subMonths, subWeeks } from "date-fns";
import { type ReactNode, useEffect, useMemo } from "react";

import CalendarDayButton from "@/features/calendar/components/CalendarDayButton";
import MonthlyCalendar from "@/features/calendar/components/MonthlyCalendar";
import WeeklyCalendar from "@/features/calendar/components/WeeklyCalendar";
import styles from "@/features/calendar/styles/Calendar.module.css";
import type { DayCellRenderProps, ViewMode } from "@/features/calendar/types/calendar.types";
import { buildMonthCalendarDays, buildWeekCalendarDays } from "@/features/calendar/utils/calendar";
import { formatDateKey } from "@/shared/utils/dateFormat";

export type CalendarProps = {
  viewMode: ViewMode;
  viewDate: Date;
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoNext?: boolean;
  className?: string;
  renderDayCell?: (props: DayCellRenderProps) => ReactNode;
  /** 현재 페이지뿐 아니라 스와이프용 이전 페이지까지 포함한 첫 날짜. */
  onRenderedStartDateChange?: (dateKey: string) => void;
};

/** 날짜 배치와 스와이프만 담당한다. 조회·헤더·선택 후 화면 전환은 사용처에서 연결한다. */
export default function Calendar({
  viewMode,
  viewDate,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
  canGoNext = true,
  className,
  renderDayCell = (props) => <CalendarDayButton {...props} />,
  onRenderedStartDateChange,
}: CalendarProps) {
  const pages = useMemo(() => {
    const previousDate = viewMode === "month" ? subMonths(viewDate, 1) : subWeeks(viewDate, 1);
    const baseDates = [previousDate, viewDate];

    if (canGoNext) {
      baseDates.push(viewMode === "month" ? addMonths(viewDate, 1) : addWeeks(viewDate, 1));
    }

    const buildDays = viewMode === "month" ? buildMonthCalendarDays : buildWeekCalendarDays;

    return baseDates.map((baseDate) => buildDays({ baseDate, selectedDate, weekStartsOn: 1 }));
  }, [canGoNext, selectedDate, viewDate, viewMode]);

  const renderedStartDate = pages[0]?.[0]?.date;
  const renderedStartDateKey = renderedStartDate ? formatDateKey(renderedStartDate) : null;

  useEffect(() => {
    if (renderedStartDateKey) {
      onRenderedStartDateChange?.(renderedStartDateKey);
    }
  }, [onRenderedStartDateChange, renderedStartDateKey]);

  const pageProps = {
    pages,
    currentPageIndex: 1,
    onSelectDate,
    onSwipePrev: onPrev,
    onSwipeNext: onNext,
    renderDayCell,
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      {viewMode === "month" ? <MonthlyCalendar {...pageProps} /> : <WeeklyCalendar {...pageProps} />}
    </div>
  );
}
