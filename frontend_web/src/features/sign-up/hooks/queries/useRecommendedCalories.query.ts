import { skipToken, useQuery } from "@tanstack/react-query";

import { fetchRecommendtargetCalories } from "@/features/profile/api/recommend.api";
import { signUpKeys } from "@/features/sign-up/constants/signUp.querykey";
import type { SignUpForm } from "@/features/sign-up/types/signUp.type";

// 추천 칼로리 계산에 필요한 값이 다 있을 때만 요청 값을 만든다
function toRequestBody(form: SignUpForm) {
  const { gender, birthYear, height, weight, activity, goal, target_weight } = form;

  if (
    gender === undefined ||
    birthYear === undefined ||
    height === undefined ||
    weight === undefined ||
    activity === undefined ||
    goal === undefined
  ) {
    return undefined;
  }

  return { gender, birthYear, height, weight, activity, goal, target_weight };
}

export function useRecommendedCaloriesQuery(form: SignUpForm) {
  const body = toRequestBody(form);

  return useQuery({
    queryKey: signUpKeys.recommendation.calories(body),
    queryFn: body ? () => fetchRecommendtargetCalories(body) : skipToken,
    // 추천 칼로리는 반올림한 정수로 쓴다
    select: (calories) => Math.round(calories),
    // 같은 입력이면 추천값도 같으므로 다시 요청하지 않는다
    staleTime: Infinity,
  });
}
