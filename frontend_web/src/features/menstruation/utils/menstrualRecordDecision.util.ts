import { differenceInCalendarDays } from "date-fns";

import {
  MENSTRUATION_STATUS,
  type MenstruationStatus,
} from "@/features/menstruation/types/menstruation.type";
import type {
  MenstraulRecordReponseDto,
  MenstrualCycleItemResponseDto,
} from "@/shared/api/types/api.response.dto";
import { parseDateKey } from "@/shared/utils/dateFormat";

type CycleDecision =
  | { type: "CREATE_CYCLE" }
  | { type: "EXTEND_CYCLE"; cycleId: number };

type MenstrualSaveDecision =
  | { type: "CREATE_CYCLE" }
  | { type: "CREATE_DAILY_RECORD"; cycleId: number }
  | { type: "UPDATE_DAILY_RECORD" }
  | { type: "BLOCKED"; reason: "ACTIVE_CYCLE_REQUIRED" };

const MAX_EXTENDABLE_CYCLE_DAY = 14;

function resolveCycleDecision({
  cycle,
  targetDate,
}: {
  cycle: MenstrualCycleItemResponseDto | null;
  targetDate: string;
}): CycleDecision {
  if (cycle === null) return { type: "CREATE_CYCLE" };

  const cycleDay =
    differenceInCalendarDays(parseDateKey(targetDate), parseDateKey(cycle.start_date)) + 1;

  if (cycleDay > 0 && cycleDay <= MAX_EXTENDABLE_CYCLE_DAY) {
    return {
      type: "EXTEND_CYCLE",
      cycleId: cycle.cycle_id,
    };
  }

  // 종료되지 않은 회차에 바로 이어 기록하면 장기 월경 기록으로 연결한다.
  const daysSinceLastRecord = differenceInCalendarDays(
    parseDateKey(targetDate),
    parseDateKey(cycle.end_date),
  );

  if (!cycle.is_end && daysSinceLastRecord === 1) {
    return {
      type: "EXTEND_CYCLE",
      cycleId: cycle.cycle_id,
    };
  }

  return { type: "CREATE_CYCLE" };
}

export function resolveMenstrualSaveDecision({
  existingRecord,
  cycle,
  targetDate,
  menstruationStatus,
}: {
  existingRecord: MenstraulRecordReponseDto["record"];
  cycle: MenstrualCycleItemResponseDto | null;
  targetDate: string;
  menstruationStatus: MenstruationStatus;
}): MenstrualSaveDecision {
  if (existingRecord !== null) {
    return { type: "UPDATE_DAILY_RECORD" };
  }

  const cycleDecision = resolveCycleDecision({ cycle, targetDate });

  if (menstruationStatus === MENSTRUATION_STATUS.NOT_BLEEDING) {
    if (cycle === null || cycle.is_end || cycleDecision.type === "CREATE_CYCLE") {
      return {
        type: "BLOCKED",
        reason: "ACTIVE_CYCLE_REQUIRED",
      };
    }

    return {
      type: "CREATE_DAILY_RECORD",
      cycleId: cycleDecision.cycleId,
    };
  }

  if (cycleDecision.type === "CREATE_CYCLE") {
    return { type: "CREATE_CYCLE" };
  }

  return {
    type: "CREATE_DAILY_RECORD",
    cycleId: cycleDecision.cycleId,
  };
}

export function getCycleIdToDeleteForFirstDayNotBleeding({
  cycle,
  existingRecord,
  menstruationStatus,
  targetDate,
}: {
  cycle: MenstrualCycleItemResponseDto | null;
  existingRecord: MenstraulRecordReponseDto["record"];
  menstruationStatus: MenstruationStatus;
  targetDate: string;
}): number | null {
  const shouldDeleteCycle =
    cycle !== null &&
    existingRecord !== null &&
    existingRecord.cycle_id === cycle.cycle_id &&
    cycle.start_date === targetDate &&
    menstruationStatus === MENSTRUATION_STATUS.NOT_BLEEDING;

  return shouldDeleteCycle ? cycle.cycle_id : null;
}
