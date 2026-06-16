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
  const weekTitle = formatCalendarHeader(selectedDate, "week");
  const monthTitle = formatCalendarHeader(viewDate, "month");

  return (
    <div className="calendar-header">
      <div className="calendar-header-top">
        <div className="calendar-header-left">
          <button
            type="button"
            className="calendar-title-button"
            onClick={onToggleViewMode}
            aria-label={viewMode === "week" ? "월 달력 펼치기" : "주 달력 접기"}
          >
            <span className="textWhite typo-title3">
              {viewMode === "week" ? weekTitle : "월간"}
            </span>
            <SystemIcon
              name="chevron-down-normal"
              size={24}
              className={`calendar-title-icon ${viewMode === "month" ? "is-open" : ""}`}
            />
          </button>
        </div>

        {viewMode === "month" && (
          <div className="calendar-header-right">
            <button
              type="button"
              className="typo-label3 textWhite"
              onClick={onToday}
              aria-label="오늘 날짜로 이동"
            >
              오늘
            </button>
          </div>
        )}
      </div>

      {viewMode === "month" && (
        <div className="calendar-month-title">
          <button type="button" className="calendar-nav-button" onClick={onPrev} aria-label="이전">
            <SystemIcon name="chevron-left-normal" size={24} />
          </button>
          <p className="typo-title3 textWhite">{monthTitle}</p>
          <button type="button" className="calendar-nav-button" onClick={onNext} aria-label="다음">
            <SystemIcon name="chevron-right-normal" size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
