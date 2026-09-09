import { addDays, endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";

import type { GetMenstrualRecordsRequestDto } from "@/shared/api/types/api.request.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export const MONTHS_PER_MENSTRUAL_QUERY = 12;

/** 마지막 월을 포함한 12개월. 경계의 기록과 연결할 수 있도록 앞뒤 하루를 포함한다. */
export function getMenstrualYearRange(lastMonthKey: string): GetMenstrualRecordsRequestDto {
  const lastMonth = parseDateKey(lastMonthKey);
  const firstMonth = subMonths(lastMonth, MONTHS_PER_MENSTRUAL_QUERY - 1);

  return {
    from_date: formatDateKey(subDays(startOfMonth(firstMonth), 1)),
    to_date: formatDateKey(addDays(endOfMonth(lastMonth), 1)),
  };
}
