import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createMenstrualCycleRecorded,
  createMenstrualRecorded,
  deleteMenstrualCycle,
  updateMenstrualRecorded,
} from "@/features/menstruation/api/menstruation.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";
import {
  MENSTRUATION_STATUS,
  type MenstruationFlow,
  type MenstruationStatus,
  type MenstruationSymptom,
} from "@/features/menstruation/types/menstruation.type";
import { resolveMenstrualSaveDecision } from "@/features/menstruation/utils/menstrualRecordDecision.util";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type {
  MenstraulRecordReponseDto,
  MenstrualCycleItemResponseDto,
} from "@/shared/api/types/api.response.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";
import { isFutureDateKey } from "@/shared/utils/dateFormat";

export function useDeleteMenstrualCycleMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMenstrualCycle,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: menstrualKeys.cycles.all() }),
        queryClient.invalidateQueries({ queryKey: menstrualKeys.detail.all() }),
      ]);

      track(EVENT_NAME.MENSTRUAL_RECORDED, {
        "생리 유무": "기록 삭제",
      });

      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

type SaveMenstrualRecordInput = {
  date: string;
  menstruationStatus: MenstruationStatus;
  flow: MenstruationFlow | undefined;
  symptoms: MenstruationSymptom[] | undefined;
  existingRecord: MenstraulRecordReponseDto["record"];
  cycle: MenstrualCycleItemResponseDto | null;
};

async function saveMenstrualRecord(input: SaveMenstrualRecordInput) {
  if (isFutureDateKey(input.date)) {
    throw new Error("미래 날짜에는 생리 기록을 저장할 수 없어요.");
  }

  const isBleeding = input.menstruationStatus === MENSTRUATION_STATUS.BLEEDING;
  const menstrualDetails = isBleeding
    ? {
        flow: input.flow,
        symptoms: input.symptoms,
      }
    : {};
  const decision = resolveMenstrualSaveDecision({
    existingRecord: input.existingRecord,
    cycle: input.cycle,
    targetDate: input.date,
    menstruationStatus: input.menstruationStatus,
  });

  switch (decision.type) {
    case "CREATE_CYCLE":
      return createMenstrualCycleRecorded({
        date: input.date,
        ...menstrualDetails,
      });

    case "CREATE_DAILY_RECORD":
      return createMenstrualRecorded({
        date: input.date,
        cycle_id: decision.cycleId,
        menstruation_status: input.menstruationStatus,
        ...menstrualDetails,
      });

    case "UPDATE_DAILY_RECORD":
      return updateMenstrualRecorded({
        date: input.date,
        menstruation_status: input.menstruationStatus,
        ...menstrualDetails,
      });

    case "BLOCKED":
      throw new Error("종료할 수 있는 생리 주기가 존재하지 않습니다.");
  }
}

export function useSaveMenstrualRecordMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveMenstrualRecord,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: menstrualKeys.cycles.all() }),
        queryClient.invalidateQueries({
          queryKey: menstrualKeys.detail.day(variables.date),
        }),
      ]);

      track(EVENT_NAME.MENSTRUAL_RECORDED, {
        "생리 유무": variables.menstruationStatus,
        "생리 양": variables.flow,
        "증상 기록": variables.symptoms,
      });

      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
