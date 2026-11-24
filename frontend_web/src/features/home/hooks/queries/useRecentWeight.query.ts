import { subMonths } from "date-fns";

import { useGetMonthlyCalendarQuery } from "@/features/calendar/hooks/queries/useMonthlyCalendar.query";
import { CALENDAR_VIEW_MODE } from "@/features/calendar/types/calendar.types";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

const DAY_MS = 24 * 60 * 60 * 1000;

type RecentWeight = {
  weight: number;
  daysAgo: number;
};

// 오늘 체중 기록이 없을 때 흐리게 보여 줄 최근 체중. 이번 달 · 지난달 기록에서 오늘 전 마지막 기록을 찾는다
export function useRecentWeightQuery(todayKey: string, { enabled }: { enabled: boolean }) {
  const thisMonth = todayKey.slice(0, 7);
  const lastMonth = formatDateKey(subMonths(parseDateKey(todayKey), 1)).slice(0, 7);
  const thisMonthQuery = useGetMonthlyCalendarQuery(
    { date: thisMonth, mode: CALENDAR_VIEW_MODE.BODY_WEIGHT },
    { enabled },
  );
  const lastMonthQuery = useGetMonthlyCalendarQuery(
    { date: lastMonth, mode: CALENDAR_VIEW_MODE.BODY_WEIGHT },
    { enabled },
  );

  let recentWeight: RecentWeight | undefined;
  for (const record of [...(lastMonthQuery.data ?? []), ...(thisMonthQuery.data ?? [])]) {
    if (record.date >= todayKey || !record.weight) continue;

    const daysAgo = Math.round(
      (parseDateKey(todayKey).getTime() - parseDateKey(record.date).getTime()) / DAY_MS,
    );
    if (recentWeight === undefined || daysAgo < recentWeight.daysAgo) {
      recentWeight = { weight: record.weight, daysAgo };
    }
  }

  return {
    recentWeight,
    isPending: enabled && (thisMonthQuery.isPending || lastMonthQuery.isPending),
  };
}
