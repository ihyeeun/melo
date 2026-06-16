import { webAuthApiData } from "@/features/kakao-web-auth/api/webAuthApi";
import { END_POINT } from "@/features/onboarding/api/endpoints";
import type { OnboardingData } from "@/features/onboarding/onboarding.types";

export function fetchRecommendtargetCalories(payload: OnboardingData) {
  return webAuthApiData<number>({
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
  return webAuthApiData<NutrientResponse>({
    endpoint: END_POINT.RECOMMEND_NUTRIENT,
    method: "POST",
    body: payload,
  });
}
