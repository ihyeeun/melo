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

export type MenstruationRecord = {
  date: string;
  menstruation_status: MenstruationStatus;
  flow: MenstruationFlow | null;
  symptoms: MenstruationSymptom[];
  cycle_id: number;
};

export type CreateMenstruationCycleRequest = {
  date: string;
  flow: MenstruationFlow | null;
  symptoms: MenstruationSymptom[];
};

export type CreateMenstruationRecordRequest = {
  date: string;
  menstruation_status: MenstruationStatus;
  cycle_id: string | null;
  flow: MenstruationFlow | null;
  symptoms: MenstruationSymptom[];
};

export type UpdateMenstruationRecordRequest = {
  menstruation_status: MenstruationStatus;
  flow: MenstruationFlow | null;
  symptoms: MenstruationSymptom[];
};

export type MenstruationRecordResponse = {
  record: MenstruationRecord | null;
};
