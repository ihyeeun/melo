import { isToday } from "date-fns";

import styles from "@/features/calendar/styles/CalendarHeader.module.css";
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
    <div className={styles.root} data-view={viewMode}>
      <div className={styles.top}>
        <div className={styles.left}>
          <button
            type="button"
            className={styles.titleButton}
            onClick={onToggleViewMode}
            aria-expanded={isMonthView}
            aria-label={isMonthView ? "주 달력 접기" : "월 달력 펼치기"}
          >
            <span className={styles.titleViewport}>
              <span key={viewMode} className={`${styles.titleText} title-s-semi`}>
                {isMonthView ? "월간 달력" : weekTitle}
              </span>
            </span>
            <SystemIcon name="chevron-down" size={12} className={styles.titleIcon} />
          </button>
        </div>
      </div>

      <div className={styles.monthTitleWrapper} aria-hidden={!isMonthView}>
        <div className={styles.monthTitleClip}>
          <div className={styles.monthTitle}>
            <button
              type="button"
              className={styles.navButton}
              onClick={onPrev}
              aria-label="이전 달"
              tabIndex={isMonthView ? 0 : -1}
            >
              <SystemIcon name="arrow-filled-left" size={24} />
            </button>
            <p className={`${styles.monthTitleText} title-m-semi`}>{monthTitle}</p>
            <button
              type="button"
              className={styles.navButton}
              onClick={onNext}
              aria-label="다음 달"
              tabIndex={isMonthView ? 0 : -1}
            >
              <SystemIcon name="arrow-filled-right" size={24} />
            </button>
          </div>
        </div>
        {isMonthView ? (
          <button
            type="button"
            className={`${styles.todayAction} body-l-medium text-secondary`}
            onClick={onToday}
            aria-label="오늘 날짜로 이동"
          >
            오늘
          </button>
        ) : null}
      </div>
    </div>
  );
}
