// response
export interface MenstruationCyclesResponse {
  cycles: CycleItem[];
}

export interface CycleItem {
  cycle_id: number;
  start_date: string;
  end_date: string;
  is_end: boolean;
}

export const MENSTRUATION_STATUS = {
  BLEEDING: "BLEEDING",
  NOT_BLEEDING: "NOT_BLEEDING",
} as const;

export type MenstruationStatus = (typeof MENSTRUATION_STATUS)[keyof typeof MENSTRUATION_STATUS];

export const MENSTRUATION_FLOW = {
  LIGHT: "LIGHT",
  MEDIUM: "MEDIUM",
  HEAVY: "HEAVY",
  VERY_HEAVY: "VERY_HEAVY",
} as const;

export type MenstruationFlow = (typeof MENSTRUATION_FLOW)[keyof typeof MENSTRUATION_FLOW];

export const MENSTRUATION_SYMPTOM = {
  ABDOMINAL_PAIN: "ABDOMINAL_PAIN",
  BACK_PAIN: "BACK_PAIN",
  HEADACHE: "HEADACHE",
  FATIGUE: "FATIGUE",
  SENSITIVITY: "SENSITIVITY",
  SWELLING: "SWELLING",
  BREAST_PAIN: "BREAST_PAIN",
  APPETITE_CHANGE: "APPETITE_CHANGE",
} as const;

export type MenstruationSymptom = (typeof MENSTRUATION_SYMPTOM)[keyof typeof MENSTRUATION_SYMPTOM];

export interface MenstruationRecordedItem {
  record: {
    date: string;
    menstruation_status: MenstruationStatus;
    flow?: MenstruationFlow;
    symptoms?: MenstruationSymptom[];
    cycle_id: number;
  };
}

// request
export interface getCyclesRequest {
  date: string;
  limit: number;
}

//
export type CycleType = { type: "CREATE_CYCLE" } | { type: "EXTEND_CYCLE"; cycle_id: number };

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type MenstrualCalculateCalendar = {
  cyclePeriod: number;
  calendar: {
    possibleDate?: DateRange;
    predictedDate?: string;
    menstrualDates: DateRange[];
  };
};

export type MenstrualPhase = "MENSTRUAL" | "FOLLICULAR" | "OVULATORY" | "LUTEAL";

export type MenstruationDateType = "menstrual" | "possible" | "predicted" | undefined;
