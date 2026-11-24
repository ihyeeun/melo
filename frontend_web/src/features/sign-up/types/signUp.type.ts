import type { ACTIVITY, GENDER, GOAL } from "@/features/profile/goalEdit.model";

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

// 입력 중인 회원가입 값. 아직 고르지 않은 값은 비어 있다
export type SignUpForm = Partial<SignUpType>;

// 회원가입 단계와 각 단계에서 입력받는 값. 적힌 순서대로 진행한다
export const SIGN_UP_STEPS = {
  basicInfo: ["gender", "birthYear"],
  body: ["height", "weight"],
  activity: ["activity"],
  goal: ["goal"],
  goalWeight: ["target_weight"],
  targetCalories: ["target_calories"],
  nutrient: ["target_ratio"],
  dietManagement: ["diet_management_status"],
  persona: ["persona_type"],
  eatingOut: ["eating_out_freq_weekly"],
  jobAndLunch: ["job_type", "lunch_location"],
  subCode: ["subCode"],
} as const satisfies Record<string, readonly (keyof SignUpType)[]>;

export type SignUpStep = keyof typeof SIGN_UP_STEPS;

// 진행 바는 단계를 6칸으로 묶어 보여 준다. 값 = 채워지는 칸 수
export const SIGN_UP_PROGRESS_TOTAL = 6;
export const SIGN_UP_PROGRESS = {
  basicInfo: 1,
  body: 1,
  activity: 2,
  goal: 2,
  goalWeight: 3,
  targetCalories: 3,
  nutrient: 4,
  dietManagement: 5,
  persona: 5,
  eatingOut: 5,
  jobAndLunch: 6,
  subCode: 6,
} as const satisfies Record<SignUpStep, number>;

// 단계 컴포넌트가 받는 props. 어떤 단계인지 밝히면 그 단계가 맡은 값만 넘길 수 있다
export type SignUpStepProps<S extends SignUpStep> = {
  // 지금까지 저장된 값. 돌아온 단계의 입력을 채우거나, 다른 단계의 값을 참고할 때 쓴다
  form: SignUpForm;
  // 이 단계에서 입력한 값을 저장하고 다음 단계로 넘어간다
  onNext: (values: Pick<SignUpForm, (typeof SIGN_UP_STEPS)[S][number]>) => void;
  // 다음 버튼 문구. 어느 단계가 마지막인지는 플랫폼마다 달라서 페이지가 정한다
  nextLabel: string;
};

// 가입 요청에 보내는 값
export type UserInfoRequest = {
  gender: number;
  birthYear: number;
  height: number;
  weight: number;
  activity: number;
  goal: number;
  target_weight: number;
  target_calories: number;
  target_ratio: [carbs: number, protein: number, fat: number];
  subCode?: string;
  diet_management_status: number[];
  persona_type: number;
  eating_out_freq_weekly: number;
  job_type: number;
  lunch_location: number | null;
};

export type UserInfoResponse = {
  nickname: string;
  email: string;
} & UserInfoRequest;

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
