import { isToday } from "date-fns";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import type { ViewMode } from "../types/calendar.types";
import { formatCalendarHeader } from "../utils/format";

type Props = {
  viewMode: ViewMode;
  viewDate: Date;
  selectedDate: Date;
  onToggleViewMode: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export default function CalendarHeader({
  viewMode,
  viewDate,
  selectedDate,
  onToggleViewMode,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const weekTitle = isToday(selectedDate) ? "오늘" : formatCalendarHeader(selectedDate, "week");
  const monthTitle = formatCalendarHeader(viewDate, "month");

  const isMonthView = viewMode === "month";

  return (
    <div className={`calendar-header ${isMonthView ? "is-month" : "is-week"}`}>
      <div className="calendar-header-top">
        <div className="calendar-header-left">
          <button
            type="button"
            className="calendar-title-button"
            onClick={onToggleViewMode}
            aria-expanded={isMonthView}
            aria-label={isMonthView ? "주 달력 접기" : "월 달력 펼치기"}
          >
            <span className="calendar-title-viewport">
              <span key={viewMode} className="calendar-title-text title-s-semi">
                {isMonthView ? "월간 달력" : weekTitle}
              </span>
            </span>
            <SystemIcon name="chevron-down" size={12} className="calendar-title-icon" />
          </button>
        </div>

        <div className="calendar-header-right" aria-hidden={!isMonthView}>
          <button
            type="button"
            className="body-l-medium text-secondary"
            onClick={onToday}
            aria-label="오늘 날짜로 이동"
            tabIndex={isMonthView ? 0 : -1}
          >
            오늘
          </button>
        </div>
      </div>

      <div className="calendar-month-title-wrapper" aria-hidden={!isMonthView}>
        <div className="calendar-month-title-clip">
          <div className="calendar-month-title">
            <button
              type="button"
              className="calendar-nav-button"
              onClick={onPrev}
              aria-label="이전 달"
              tabIndex={isMonthView ? 0 : -1}
            >
              <SystemIcon name="arrow-filled-left" size={24} />
            </button>
            <p className="calendar-month-title-text title-m-semi">{monthTitle}</p>
            <button
              type="button"
              className="calendar-nav-button"
              onClick={onNext}
              aria-label="다음 달"
              tabIndex={isMonthView ? 0 : -1}
            >
              <SystemIcon name="arrow-filled-right" size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
