import type { UseQueryResult } from "@tanstack/react-query";

import MenstruationDayCell from "@/features/calendar/components/menstruation/MenstruationDayCell";
import styles from "@/features/calendar/styles/MenstruationCalendar.module.css";
import { buildMonthCalendarDays } from "@/features/calendar/utils/calendar";
import { formatCalendarHeader, WEEKDAY_LABELS } from "@/features/calendar/utils/format";
import {
  isMenstrualDateSelected,
  type MenstrualDateSelections,
} from "@/features/menstruation/utils/menstrualRecordSelection.util";
import type { MenstrualRecordsResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

type Month = {
  monthKey: string;
  query: UseQueryResult<MenstrualRecordsResponseDto>;
};

type Props = {
  months: Month[];
  selections: MenstrualDateSelections;
  onToggleDate: (dateKey: string, isRecorded: boolean) => void;
  disabled?: boolean;
};

export default function MenstruationCalendar({ months, ...selection }: Props) {
  return (
    <section
      className={styles.calendar}
      aria-label="생리 기록 달력"
    >
      {months.map((month) => (
        <MenstruationMonth key={month.monthKey} {...month} {...selection} />
      ))}
    </section>
  );
}

function MenstruationMonth({
  monthKey,
  query,
  selections,
  onToggleDate,
  disabled = false,
}: Omit<Props, "months"> & Month) {
  const baseDate = parseDateKey(monthKey);
  const label = formatCalendarHeader(baseDate, "month");
  const days = buildMonthCalendarDays({ baseDate });
  const ranges = query.data?.recorded_ranges ?? [];

  return (
    <section className={styles.month} aria-label={label} aria-busy={query.isFetching}>
      <h2 className={`title-m-semi ${styles.monthTitle}`}>{label}</h2>

      <div className={styles.status} aria-live="polite">
        {query.isPending && <LoadingIndicator iconSize={32} />}
        {query.isError && (
          <Button
            variant="text"
            size="s"
            className={styles.retryButton}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            다시 시도
          </Button>
        )}
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday} className="caption-m-semi text-disabled">
            {weekday}
          </span>
        ))}
      </div>

      <fieldset
        className={styles.grid}
        disabled={disabled || query.isPending || query.isError}
        aria-label={`${label} 날짜 선택`}
      >
        {days.map((day) => {
          const dateKey = formatDateKey(day.date);
          if (!day.isCurrentMonth) return <span key={dateKey} aria-hidden="true" />;

          // 월을 걸치는 기록도 해당 월의 날짜에만 표시한다.
          const recorded = ranges.some(
            (range) => range.start_date <= dateKey && dateKey <= range.end_date,
          );
          const isSelected = isMenstrualDateSelected(selections, dateKey, recorded);

          return (
            <MenstruationDayCell
              key={dateKey}
              day={{ ...day, isSelected }}
              variant="month"
              selectionMode="multiple"
              menstruationType={recorded ? "menstrual_recorded" : null}
              onSelect={() => onToggleDate(dateKey, recorded)}
            />
          );
        })}
      </fieldset>
    </section>
  );
}
