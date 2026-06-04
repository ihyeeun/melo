import { useQuery } from "@tanstack/react-query";

import { getMealRecordedDates } from "@/features/calendar/api/recordedDates";
import { queryKeys } from "@/features/calendar/hooks/queries/queryKey";
import { isValidDateKey } from "@/shared/utils/dateFormat";

type UseCalendarRecordedDatesQueryParams = {
  enabled: boolean;
  startDate: string;
  endDate: string;
};

const EMPTY_RECORDED_DATES: string[] = [];

export function useCalendarRecordedDatesQuery({
  enabled,
  startDate,
  endDate,
}: UseCalendarRecordedDatesQueryParams) {
  const query = useQuery({
    queryKey: queryKeys.recordedDates.range(startDate, endDate),
    queryFn: () => getMealRecordedDates({ startDate, endDate }),
    enabled: enabled && isValidDateKey(startDate) && isValidDateKey(endDate),
    staleTime: Infinity,
  });

  return {
    ...query,
    recordedDates: query.data ?? EMPTY_RECORDED_DATES,
  };
}
