import { subDays } from "date-fns";

import { sortCyclesByLatest } from "@/features/menstruation/utils/menstrualCycleCalculation.util";
import type { MenstrualCyclesResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

interface MenstrualHistory {
  cycles: {
    cycleId: number;
    startDate: string;
    endDate: string;
    isEnd: boolean;
  }[];
  nextTargetDate: string | null;
}

export function transformMenstrualCyclesResponse(
  res: MenstrualCyclesResponseDto,
  limit: number,
): MenstrualHistory {
  const sortCycles = sortCyclesByLatest([...res.cycles]) ?? [];

  const cycles = sortCycles.map((cycle) => ({
    cycleId: cycle.cycle_id,
    startDate: cycle.start_date,
    endDate: cycle.end_date,
    isEnd: cycle.is_end,
  }));

  const oldestCycle = cycles.at(-1);

  const nextTargetDate =
    sortCycles.length === limit && oldestCycle
      ? formatDateKey(subDays(parseDateKey(oldestCycle?.startDate), 1))
      : null;

  return { cycles, nextTargetDate };
}
