export const MENSTRUATION_STATUS = {
  BLEEDING: "있음",
  NOT_BLEEDING: "없음",
} as const;

export type MenstruationStatus = (typeof MENSTRUATION_STATUS)[keyof typeof MENSTRUATION_STATUS];

export const MENSTRUATION_FLOW = {
  LIGHT: "적음",
  MEDIUM: "보통",
  HEAVY: "많음",
  VERY_HEAVY: "매우 많음",
} as const;

export type MenstruationFlow = (typeof MENSTRUATION_FLOW)[keyof typeof MENSTRUATION_FLOW];

export const MENSTRUATION_SYMPTOM = {
  ABDOMINAL_PAIN: "복통",
  BACK_PAIN: "허리 통증",
  HEADACHE: "두통",
  FATIGUE: "피로감",
  MOOD_SWINGS: "감정 기복",
  SWELLING: "붓기",
  BREAST_PAIN: "유방 통증",
  APPETITE_CHANGE: "식욕 변화",
  DIARRHEA: "설사",
  ACNE: "여드름",
  SLEEP_PATTERN_CHANGE: "수면 패턴 변화",
  BLOATING: "복부 팽만",
  CONSTIPATION: "변비",
  NAUSEA: "메스꺼움",
  PELVIC_PAIN: "골반 통증",
  NONE: "없음",
} as const;

export type MenstruationSymptom = (typeof MENSTRUATION_SYMPTOM)[keyof typeof MENSTRUATION_SYMPTOM];

//
export type CycleType = { type: "CREATE_CYCLE" } | { type: "EXTEND_CYCLE"; cycle_id: number };
export type MenstrualSaveDecision =
  | { type: "CREATE_CYCLE" }
  | {
      type: "CREATE_DAILY_RECORD";
      cycleId: number;
    }
  | {
      type: "UPDATE_DAILY_RECORD";
    }
  | {
      type: "BLOCKED";
      reason: "ACTIVE_CYCLE_REQUIRED";
    };

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

export type MenstrualDisplayState = MenstrualPhase | "DELAYED";

export type MenstruationDateType = "menstrual" | "possible" | "predicted" | undefined;
