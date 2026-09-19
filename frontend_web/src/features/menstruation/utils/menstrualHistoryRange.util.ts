import { addDays, endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";

import { MAX_MENSTRUAL_BLOCK_GAP_DAYS } from "@/features/menstruation/utils/menstrualCycleRecords.util";
import type { GetMenstrualRecordsRequestDto } from "@/shared/api/types/api.request.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export const MONTHS_PER_MENSTRUAL_QUERY = 12;

/** 마지막 월을 포함한 12개월. 최대 2일 공백 뒤의 기록을 연결할 수 있도록 앞뒤 3일을 포함한다. */
export function getMenstrualYearRange(lastMonthKey: string): GetMenstrualRecordsRequestDto {
  const lastMonth = parseDateKey(lastMonthKey);
  const firstMonth = subMonths(lastMonth, MONTHS_PER_MENSTRUAL_QUERY - 1);
  const boundaryPaddingDays = MAX_MENSTRUAL_BLOCK_GAP_DAYS + 1;

  return {
    from_date: formatDateKey(subDays(startOfMonth(firstMonth), boundaryPaddingDays)),
    to_date: formatDateKey(addDays(endOfMonth(lastMonth), boundaryPaddingDays)),
  };
}
