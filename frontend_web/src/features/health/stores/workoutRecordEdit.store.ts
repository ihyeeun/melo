import { create } from "zustand";

import type { WorkoutRecordItemResponseDto } from "@/shared/api/types/api.response.dto";

type WorkoutRecord = WorkoutRecordItemResponseDto;
type WorkoutRecordId = WorkoutRecord["workout_id"];

type WorkoutRecordEditState = {
  date: string | null;
  records: WorkoutRecord[];
  actions: {
    clear: () => void;
    initialize: (params: { date: string; records: WorkoutRecord[] }) => void;
    moveRecord: (fromWorkoutId: WorkoutRecordId, toWorkoutId: WorkoutRecordId) => void;
    removeRecord: (workoutId: WorkoutRecordId) => void;
    replaceRecord: (record: WorkoutRecord) => void;
  };
};

function cloneWorkoutRecord(record: WorkoutRecord): WorkoutRecord {
  return {
    ...record,
    ...(record.set_list ? { set_list: record.set_list.map((set) => ({ ...set })) } : {}),
  };
}

function moveRecordById(
  records: WorkoutRecord[],
  fromWorkoutId: WorkoutRecordId,
  toWorkoutId: WorkoutRecordId,
) {
  if (fromWorkoutId === toWorkoutId) return records;

  const fromIndex = records.findIndex((record) => record.workout_id === fromWorkoutId);
  const toIndex = records.findIndex((record) => record.workout_id === toWorkoutId);

  if (fromIndex < 0 || toIndex < 0) return records;

  const nextRecords = [...records];
  const [movedRecord] = nextRecords.splice(fromIndex, 1);

  if (!movedRecord) return records;

  nextRecords.splice(toIndex, 0, movedRecord);

  return nextRecords;
}

const useWorkoutRecordEditStore = create<WorkoutRecordEditState>((set) => ({
  date: null,
  records: [],

  actions: {
    clear: () => {
      set({
        date: null,
        records: [],
      });
    },

    initialize: ({ date, records }) => {
      set({
        date,
        records: records.map(cloneWorkoutRecord),
      });
    },

    moveRecord: (fromWorkoutId, toWorkoutId) => {
      set((state) => ({
        records: moveRecordById(state.records, fromWorkoutId, toWorkoutId),
      }));
    },

    removeRecord: (workoutId) => {
      set((state) => ({
        records: state.records.filter((record) => record.workout_id !== workoutId),
      }));
    },

    replaceRecord: (record) => {
      set((state) => {
        const nextRecord = cloneWorkoutRecord(record);
        const targetIndex = state.records.findIndex(
          (currentRecord) => currentRecord.workout_id === nextRecord.workout_id,
        );

        if (targetIndex < 0) {
          return {
            records: [...state.records, nextRecord],
          };
        }

        const nextRecords = [...state.records];
        nextRecords[targetIndex] = nextRecord;

        return {
          records: nextRecords,
        };
      });
    },
  },
}));

export const useWorkoutRecordEditDate = () =>
  useWorkoutRecordEditStore((state) => state.date);
export const useWorkoutRecordEditRecords = () =>
  useWorkoutRecordEditStore((state) => state.records);
export const useClearWorkoutRecordEdit = () =>
  useWorkoutRecordEditStore((state) => state.actions.clear);
export const useInitializeWorkoutRecordEdit = () =>
  useWorkoutRecordEditStore((state) => state.actions.initialize);
export const useMoveWorkoutRecordEditRecord = () =>
  useWorkoutRecordEditStore((state) => state.actions.moveRecord);
export const useRemoveWorkoutRecordEditRecord = () =>
  useWorkoutRecordEditStore((state) => state.actions.removeRecord);
export const useReplaceWorkoutRecordEditRecord = () =>
  useWorkoutRecordEditStore((state) => state.actions.replaceRecord);
