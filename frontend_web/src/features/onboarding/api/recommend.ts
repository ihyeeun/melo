import { END_POINT } from "@/features/onboarding/api/endpoints";
import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import { authedApiData } from "@/shared/api/appApi";

export function fetchRecommendtargetCalories(payload: OnboardingData) {
  return authedApiData<number>({
    endpoint: END_POINT.RECOMMEND_CALORIES,
    method: "POST",
    body: payload,
  });
}

type NutrientResponse = {
  carbs: number;
  protein: number;
  fat: number;
};
export function postRecommendNutrient(payload: OnboardingData) {
  return authedApiData<NutrientResponse>({
    endpoint: END_POINT.RECOMMEND_NUTRIENT,
    method: "POST",
    body: payload,
  });
}
