import { useQuery } from "@tanstack/react-query";

import { getMonthlyCalendarMode } from "@/features/calendar/api/recordedDates.api";
import { calendarKeys } from "@/features/calendar/hooks/queries/calendar.queryKey";
import type { CalendarViewMode } from "@/features/calendar/types/calendar.types";
import type { MonthlyCalendarRequestDto } from "@/shared/api/types/api.request.dto";

export function useGetMonthlyCalendarQuery<M extends CalendarViewMode>({
  date,
  mode,
}: MonthlyCalendarRequestDto<M>) {
  return useQuery({
    queryKey: calendarKeys.monthly.month({ date, mode }),
    queryFn: () => getMonthlyCalendarMode({ date, mode }),
    staleTime: Infinity,
  });
}
