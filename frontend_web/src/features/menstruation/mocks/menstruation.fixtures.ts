import type { CycleItem } from "@/features/menstruation/types/menstruation.type";

import {
  MENSTRUATION_FLOW,
  MENSTRUATION_STATUS,
  MENSTRUATION_SYMPTOM,
  type MenstruationRecord,
} from "../menstruation.types";

/** 최근 월경 회차 조회 API가 반환할 고정 목 데이터 */
export const mockMenstruationCycles: CycleItem[] = [
  // {
  //   cycle_id: 7,
  //   start_date: "2026-08-14",
  //   end_date: "2026-08-17",
  //   is_end: true,
  // },
  // {
  //   cycle_id: 6,
  //   start_date: "2026-07-14",
  //   end_date: "2026-07-17",
  //   is_end: true,
  // },
  // {
  //   cycle_id: 5,
  //   start_date: "2026-06-22",
  //   end_date: "2026-06-26",
  //   is_end: true,
  // },
  // {
  //   cycle_id: 4,
  //   start_date: "2026-05-25",
  //   end_date: "2026-05-29",
  //   is_end: true,
  // },
  // {
  //   cycle_id: 3,
  //   start_date: "2026-04-27",
  //   end_date: "2026-05-01",
  //   is_end: true,
  // },
  // {
  //   cycle_id: 2,
  //   start_date: "2026-03-30",
  //   end_date: "2026-04-03",
  //   is_end: true,
  // },
  // {
  //   cycle_id: 1,
  //   start_date: "2026-03-02",
  //   end_date: "2026-03-06",
  //   is_end: true,
  // },
];

/** 날짜별 월경 기록 조회 API가 반환할 고정 목 데이터 */
export const mockMenstruationRecords: MenstruationRecord[] = [
  {
    date: "2026-08-22",
    menstruation_status: MENSTRUATION_STATUS.BLEEDING,
    flow: MENSTRUATION_FLOW.MEDIUM,
    symptoms: [MENSTRUATION_SYMPTOM.ABDOMINAL_PAIN],
    cycle_id: 7,
  },
  {
    date: "2026-08-19",
    menstruation_status: MENSTRUATION_STATUS.BLEEDING,
    flow: MENSTRUATION_FLOW.HEAVY,
    symptoms: [MENSTRUATION_SYMPTOM.BACK_PAIN, MENSTRUATION_SYMPTOM.HEADACHE],
    cycle_id: 6,
  },
  {
    date: "2026-07-20",
    menstruation_status: MENSTRUATION_STATUS.BLEEDING,
    flow: MENSTRUATION_FLOW.MEDIUM,
    symptoms: [],
    cycle_id: 5,
  },
  {
    date: "2026-07-25",
    menstruation_status: MENSTRUATION_STATUS.NOT_BLEEDING,
    flow: null,
    symptoms: [],
    cycle_id: 4,
  },
  {
    date: "2026-06-22",
    menstruation_status: MENSTRUATION_STATUS.BLEEDING,
    flow: MENSTRUATION_FLOW.LIGHT,
    symptoms: [MENSTRUATION_SYMPTOM.FATIGUE],
    cycle_id: 3,
  },
  {
    date: "2026-06-27",
    menstruation_status: MENSTRUATION_STATUS.NOT_BLEEDING,
    flow: null,
    symptoms: [],
    cycle_id: 2,
  },
  {
    date: "2026-05-25",
    menstruation_status: MENSTRUATION_STATUS.BLEEDING,
    flow: MENSTRUATION_FLOW.VERY_HEAVY,
    symptoms: [MENSTRUATION_SYMPTOM.ABDOMINAL_PAIN, MENSTRUATION_SYMPTOM.BACK_PAIN],
    cycle_id: 1,
  },
];
