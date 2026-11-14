import type { SignUpForm } from "@/features/sign-up/types/signUp.type";

export const signUpKeys = {
  all: ["sign-up"],

  recommendation: {
    all: () => [...signUpKeys.all, "recommendation"] as const,
    calories: (body: SignUpForm | undefined) =>
      [...signUpKeys.recommendation.all(), "calories", body] as const,
    ratio: (body: SignUpForm) => [...signUpKeys.recommendation.all(), "ratio", body] as const,
  },
};
