import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useActivity } from "@stackflow/react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { type ReactNode, useMemo, useRef, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import CalendarHeader from "@/features/calendar/components/CalendarHeader";
import DayCell from "@/features/calendar/components/dayCell";
import { useGetMonthlyCalendarQuery } from "@/features/calendar/hooks/queries/useMonthlyCalendar.query";
import { useOutsideInteraction } from "@/features/calendar/hooks/useOutsideInteraction";
import styles from "@/features/calendar/styles/RecordCalendar.module.css";
import type {
  CalendarViewMode,
  DayCellRenderProps,
} from "@/features/calendar/types/calendar.types";
import {
  formatMonthlyCalendarRecord,
  MONTHLY_RECORD_MODES,
} from "@/features/calendar/utils/monthlyCalendar";
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
  showRecordModes?: boolean;
  initialRecordMode?: CalendarViewMode;
  renderDayCell?: (props: RecordDayCellRenderProps) => ReactNode;
};

const EMPTY_RECORDED_DATES: string[] = [];
/** 이 속성이 붙은 요소는 달력 바깥에 있어도 월간 보기를 접지 않는다. */
const KEEP_CALENDAR_OPEN_SELECTOR = "[data-keep-calendar-open]";

/** 기존 기록 화면의 조회·디자인·주간 전환 정책을 조합한다. */
export default function RecordCalendar({
  onSelectDate,
  onVisibleStartDateChange,
  safeAreaTop = true,
  selectedDate: controlledSelectedDate,
  showMonthBackground = true,
  showRecordedDots = true,
  showRecordModes = true,
  initialRecordMode = "intake",
  renderDayCell,
}: Props) {
  const [recordMode, setRecordMode] = useState<CalendarViewMode>(initialRecordMode);
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
  const { isActive } = useActivity();
  const rootRef = useRef<HTMLElement>(null);
  const showMonthlyRecords = viewMode === "month" && !renderDayCell;
  const monthlyQuery = useGetMonthlyCalendarQuery(
    { date: formatDateKey(viewDate).slice(0, 7), mode: recordMode },
    { enabled: showMonthlyRecords && isActive },
  );
  const monthlyRecords = useMemo(
    () => new Map(monthlyQuery.data?.map((record) => [record.date, record])),
    [monthlyQuery.data],
  );
  const recordTypeLabel = MONTHLY_RECORD_MODES.find((option) => option.value === recordMode)?.label;

  const recordedDateRange = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    // 주간 스와이프 시 인접 월의 식사 기록 점도 함께 표시한다.
    const firstDate = startOfWeek(subMonths(monthStart, 1), { weekStartsOn: 1 });
    const lastDate = endOfWeek(endOfMonth(addMonths(monthStart, 1)), { weekStartsOn: 1 });

    return {
      startDate: formatDateKey(firstDate),
      endDate: formatDateKey(addDays(lastDate, 1)),
    };
  }, [viewDate]);

  const { data: fetchedRecordedDates } = useCalendarRecordedDatesQuery({
    enabled: showRecordedDots && isActive && viewMode === "week",
    startDate: recordedDateRange.startDate,
    endDate: recordedDateRange.endDate,
  });
  const recordedDates = showRecordedDots
    ? (fetchedRecordedDates ?? EMPTY_RECORDED_DATES)
    : EMPTY_RECORDED_DATES;

  const recordedDateSet = useMemo(() => new Set(recordedDates), [recordedDates]);

  // 월간 보기에서 달력 바깥을 탭·스크롤하면 선택한 날짜의 주간 보기로 접는다.
  useOutsideInteraction(rootRef, {
    enabled: viewMode === "month" && isActive,
    ignoreSelector: KEEP_CALENDAR_OPEN_SELECTOR,
    onInteraction: () => {
      selectDate(selectedDate);
      setViewMode("week");
    },
  });

  const handleSelectDate = (date: Date) => {
    selectDate(date);
    setViewMode("week");
    onSelectDate?.(date);
  };

  const handleGoToday = () => {
    const today = goToday();
    setViewMode("week");
    onSelectDate?.(today);
  };

  return (
    <section
      ref={rootRef}
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

      {showMonthlyRecords && (
        <>
          {showRecordModes && (
            <ToggleGroup
              className={styles.recordModes}
              aria-label="월간 기록 항목"
              value={[recordMode]}
              onValueChange={(values) => {
                if (values[0]) setRecordMode(values[0]);
              }}
            >
              {MONTHLY_RECORD_MODES.map(({ value, label }) => (
                <Toggle key={value} value={value} className={`${styles.recordMode} body-s-medium`}>
                  {label}
                </Toggle>
              ))}
            </ToggleGroup>
          )}
          {monthlyQuery.isError ? (
            <button
              type="button"
              onClick={() => void monthlyQuery.refetch()}
              className={`${styles.status} caption-m-regular text-secondary`}
              role="alert"
            >
              <p>월간 기록을 불러오지 못했어요</p>
              <p>다시 시도</p>
            </button>
          ) : null}
        </>
      )}

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
          const dateKey = formatDateKey(props.day.date);
          const recordLabel =
            showMonthlyRecords && props.day.isCurrentMonth
              ? formatMonthlyCalendarRecord(monthlyRecords.get(dateKey), recordMode)
              : undefined;

          return renderDayCell ? (
            renderDayCell(dayCellProps)
          ) : (
            <DayCell
              {...dayCellProps}
              hasRecord={
                showMonthlyRecords ? recordLabel !== undefined : recordedDateSet.has(dateKey)
              }
              recordLabel={recordLabel}
              recordTypeLabel={showMonthlyRecords ? recordTypeLabel : undefined}
            />
          );
        }}
      />
    </section>
  );
}
