export interface SignUpType {
  gender: (typeof GENDER)[keyof typeof GENDER];
  birthYear: number;
  height: number;
  weight: number;
  activity: (typeof ACTIVITY)[keyof typeof ACTIVITY];
  goal: (typeof GOAL)[keyof typeof GOAL];
  target_weight: number;
  target_calories: number;
  target_ratio: [number, number, number];
  subCode: string;
  diet_management_status: (typeof MEAL_MANAGEMENT)[keyof typeof MEAL_MANAGEMENT][]; // 복수 선택
  persona_type: (typeof PERSONA)[keyof typeof PERSONA];
  eating_out_freq_weekly: (typeof MEAL_OUTSIDE)[keyof typeof MEAL_OUTSIDE];
  job_type: (typeof JOB_TYPE)[keyof typeof JOB_TYPE];
  lunch_location: (typeof LUNCH_LOCATION)[keyof typeof LUNCH_LOCATION] | null;
}

export const GENDER = {
  MALE: 0,
  FEMALE: 1,
} as const;

export const ACTIVITY = {
  S: 0,
  M: 1,
  L: 2,
  XL: 3,
} as const;

export const GOAL = {
  LOSE_WEIGHT: 0,
  MAINTAIN_WEIGHT: 1,
  GAIN_WEIGHT: 2,
} as const;

export const MEAL_MANAGEMENT = {
  APP: 0,
  PT: 1,
  NO_RECORD: 2,
  NONE: 3,
  ETC: 4,
} as const;

export const PERSONA = {
  SEARCHER: 0,
  ROUTINE: 1,
  CASUAL: 2,
  ETC: 3,
} as const;

export const MEAL_OUTSIDE = {
  S: 0,
  M: 1,
  L: 2,
} as const;

export const JOB_TYPE = {
  OFFICE: 0,
  FREELANCE: 1,
  STUDENT: 2,
  ETC: 3,
} as const;

export const LUNCH_LOCATION = {
  OUTSIDE: 0,
  INSIDE: 1,
  BOX: 2,
  HOME: 3,
  ETC: 4,
} as const;

export const EXERCISE = {
  NONE: 0,
  S: 1,
  M: 2,
  L: 3,
} as const;

export const MEDICAL = {
  NONE: 0,
  USE: 1,
  STOP: 2,
  SKIP: 3,
} as const;

export const SOCIAL = {
  INSTAGRAM: 0,
  APP_STORE: 1,
  REFERRAL: 2,
  ETC: 3,
} as const;
