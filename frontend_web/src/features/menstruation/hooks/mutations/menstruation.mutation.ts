import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createMenstrualCycleRecorded,
  createMenstrualRecorded,
  deleteMenstrualCycle,
  updateMenstrualRecorded,
} from "@/features/menstruation/api/menstruation.api";
import {
  MENSTRUATION_STATUS,
  type MenstruationFlow,
  type MenstruationStatus,
  type MenstruationSymptom,
} from "@/features/menstruation/types/menstruation.type";
import { resolveMenstrualSaveDecision } from "@/features/menstruation/utils/menstruation.util";
import type {
  MenstraulRecordReponseDto,
  MenstrualCycleItemResponseDto,
} from "@/shared/api/types/api.response.dto";
import type { UseMutationCallback } from "@/shared/api/types/callback.types";

export function useCreateMenstrualCycleRecordedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMenstrualCycleRecorded,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menstruation-cycles"] });
    },
  });
}

export function useCreateMenstrualRecordedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMenstrualRecorded,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["menstruation-cycles"] });

      // 무효화 대신 setQuery를 사용해도 될 거 같음.
      queryClient.invalidateQueries({ queryKey: ["menstrual-recorded", data.record?.date] });
    },
  });
}

export function useUpdateMenstrualRecordedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMenstrualRecorded,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["menstruation-cycles"] });

      // 무효화 대신 setQuery를 사용해도 될 거 같음.
      queryClient.invalidateQueries({ queryKey: ["menstrual-recorded", data.record?.date] });
    },
  });
}

export function useDeleteMenstrualCycleMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMenstrualCycle,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["menstruation-cycles"] }),
        queryClient.invalidateQueries({ queryKey: ["menstrual-recorded"] }),
      ]);

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

export async function saveMenstrualRecord(input: SaveMenstrualRecordInput) {
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
      throw new Error("연결할 수 있는 진행 중인 월경 회차가 없습니다.");
  }
}

export function useSaveMenstrualRecordMutation(callbacks?: UseMutationCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveMenstrualRecord,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["menstruation-cycles"] }),
        queryClient.invalidateQueries({
          queryKey: ["menstrual-recorded", variables.date],
        }),
      ]);

      callbacks?.onSuccess?.();
    },
  });
}
