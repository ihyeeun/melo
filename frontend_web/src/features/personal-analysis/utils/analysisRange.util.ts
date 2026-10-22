import { subDays } from "date-fns";

import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export const ANALYSIS_DAYS = 30;

export function getAnalysisRange(standardDate: string) {
  return {
    start: formatDateKey(subDays(parseDateKey(standardDate), ANALYSIS_DAYS - 1)),
    end: standardDate,
  };
}
