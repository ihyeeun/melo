import { useQuery } from "@tanstack/react-query";

import { getMealRecordedDates } from "@/features/calendar/api/recordedDates.api";
import { queryKeys } from "@/features/calendar/hooks/queries/calendar.queryKey";
import { isValidDateKey } from "@/shared/utils/dateFormat";

type UseCalendarRecordedDatesQueryParams = {
  enabled: boolean;
  startDate: string;
  endDate: string;
};

export function useCalendarRecordedDatesQuery({
  enabled,
  startDate,
  endDate,
}: UseCalendarRecordedDatesQueryParams) {
  return useQuery({
    queryKey: queryKeys.recordedDates.range(startDate, endDate),
    queryFn: () => getMealRecordedDates({ startDate, endDate }),
    enabled: enabled && isValidDateKey(startDate) && isValidDateKey(endDate),
    staleTime: Infinity,
  });
}
