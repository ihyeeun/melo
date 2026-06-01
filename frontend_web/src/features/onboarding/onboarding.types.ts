import type { ComponentType } from "react";

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
  lunch_location: number;
};

export type UserInfoResponse = {
  nickname: string;
  email: string;
} & UserInfoRequest;

export type OnboardingData = Partial<Omit<UserInfoRequest, "target_ratio">> & {
  carbs?: number;
  protein?: number;
  fat?: number;
};

export type StepId =
  | "gender"
  | "body"
  | "activity"
  | "goal"
  | "goalWeight"
  | "targetCalories"
  | "nutrient"
  | "diet_management_status"
  | "persona_type"
  | "eating_out_freq_weekly"
  | "job_type_and_lunch_location"
  | "subCode";

export type StepComponentProps = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
};

export type StepMeta = {
  id: StepId;
  title: string;
  component: ComponentType<StepComponentProps>;
  isValid: (data: OnboardingData) => boolean;
  nextText?: string;
};
