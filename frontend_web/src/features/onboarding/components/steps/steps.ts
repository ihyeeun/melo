import StepActivity from "@/features/onboarding/components/steps/StepActivity";
import StepBody from "@/features/onboarding/components/steps/StepBody";
import StepDietManagementStatus from "@/features/onboarding/components/steps/StepDietManagementStatus";
import StepEatingOutFrequency from "@/features/onboarding/components/steps/StepEatingOutFrequency";
import StepGender from "@/features/onboarding/components/steps/StepGender";
import StepGoal from "@/features/onboarding/components/steps/StepGoal";
import SteptargetCalories from "@/features/onboarding/components/steps/StepGoalCalories";
import StepGoalWeight from "@/features/onboarding/components/steps/StepGoalWeight";
import StepJobAndLunchLocation from "@/features/onboarding/components/steps/StepJobAndLunchLocation";
import StepNutrient from "@/features/onboarding/components/steps/StepNutrient";
import StepPersonaType from "@/features/onboarding/components/steps/StepPersonaType";
import StepSubscribedCode from "@/features/onboarding/components/steps/StepSubscribedCode";
import type { StepMeta } from "@/features/onboarding/onboarding.types";
import { isValidBirthYear } from "@/shared/commons/picker/yearOptions";

const hasSelectedValue = (value?: number | null) => value !== undefined && value !== null;

const BASE_STEPS: StepMeta[] = [
  {
    id: "gender",
    title: "성별/출생연도",
    component: StepGender,
    isValid: (d) => hasSelectedValue(d.gender) && isValidBirthYear(d.birthYear),
  },
  {
    id: "body",
    title: "키 / 몸무게",
    component: StepBody,
    isValid: (d) => !!d.height && !!d.weight,
  },
  {
    id: "activity",
    title: "활동량",
    component: StepActivity,
    isValid: (d) => hasSelectedValue(d.activity),
  },
  {
    id: "goal",
    title: "목표",
    component: StepGoal,
    isValid: (d) => hasSelectedValue(d.goal),
  },
  {
    id: "goalWeight",
    title: "목표 체중",
    component: StepGoalWeight,
    isValid: (d) => !!d.target_weight,
  },
  {
    id: "targetCalories",
    title: "목표 칼로리",
    component: SteptargetCalories,
    isValid: () => true,
  },
  {
    id: "nutrient",
    title: "탄단지 비율 선택",
    component: StepNutrient,
    isValid: () => true,
  },
  {
    id: "diet_management_status",
    title: "식단 관리 상태",
    component: StepDietManagementStatus,
    isValid: (d) => hasSelectedValue(d.diet_management_status),
  },
  {
    id: "persona_type",
    title: "메뉴 선택 타입",
    component: StepPersonaType,
    isValid: (d) => hasSelectedValue(d.persona_type),
  },
  {
    id: "eating_out_freq_weekly",
    title: "일주일에 외식 여부",
    component: StepEatingOutFrequency,
    isValid: (d) => hasSelectedValue(d.eating_out_freq_weekly),
  },
  {
    id: "job_type_and_lunch_location",
    title: "하는 일 및 점심 위치",
    component: StepJobAndLunchLocation,
    isValid: (d) => hasSelectedValue(d.job_type) && hasSelectedValue(d.lunch_location),
  },
];

const SUBSCRIBED_CODE_STEP: StepMeta = {
  id: "subCode",
  title: "코드 입력",
  component: StepSubscribedCode,
  isValid: (d) => Boolean(d.subCode?.trim()),
};

type OnboardingStepOptions = {
  showSubscribedCodeStep: boolean;
};

export function getOnboardingSteps({ showSubscribedCodeStep }: OnboardingStepOptions): StepMeta[] {
  const steps = showSubscribedCodeStep ? [...BASE_STEPS, SUBSCRIBED_CODE_STEP] : [...BASE_STEPS];
  const lastStepIndex = steps.length - 1;

  return steps.map((step, index) => ({
    ...step,
    nextText: index === lastStepIndex ? "시작" : undefined,
  }));
}
