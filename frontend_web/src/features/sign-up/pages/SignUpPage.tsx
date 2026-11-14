import { useEffect, useMemo } from "react";

import { getWebAuthAccessToken } from "@/features/kakao-web-auth/api/webAuthApi";
import { SignUpFrame } from "@/features/sign-up/components/SignUpFrame";
import { SignUpHeader } from "@/features/sign-up/components/SignUpHeader";
import { ActivityLevelStep } from "@/features/sign-up/components/steps/ActivityLevelStep";
import { BasicInfoStep } from "@/features/sign-up/components/steps/BasicInfoStep";
import { BodyInfoStep } from "@/features/sign-up/components/steps/BodyInfoStep";
import { DietManagementStep } from "@/features/sign-up/components/steps/DietManagementStep";
import { EatingOutFrequencyStep } from "@/features/sign-up/components/steps/EatingOutFrequencyStep";
import { GoalStep } from "@/features/sign-up/components/steps/GoalStep";
import { GoalWeightStep } from "@/features/sign-up/components/steps/GoalWeightStep";
import { JobAndLunchStep } from "@/features/sign-up/components/steps/JobAndLunchStep";
import { NutrientRatioStep } from "@/features/sign-up/components/steps/NutrientRatioStep";
import { PersonaTypeStep } from "@/features/sign-up/components/steps/PersonaTypeStep";
import { SubCodeStep } from "@/features/sign-up/components/steps/SubCodeStep";
import { TargetCaloriesStep } from "@/features/sign-up/components/steps/TargetCaloriesStep";
import { useSignUpSubmit } from "@/features/sign-up/hooks/useSignUpSubmit";
import { useSignUpForm, useSignUpFormActions } from "@/features/sign-up/stores/signUpForm.store";
import {
  SIGN_UP_STEPS,
  type SignUpForm,
  type SignUpStep,
} from "@/features/sign-up/types/signUp.type";
import { PATH } from "@/router/path";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

export default function SignUpPage() {
  const navigate = useNavigate();
  // 구독 코드는 웹에서 가입할 때만 입력받는다
  const steps = useMemo(() => {
    const allSteps = Object.keys(SIGN_UP_STEPS) as SignUpStep[];
    return isNativeApp() ? allSteps.filter((step) => step !== "subCode") : allSteps;
  }, []);

  // 단계마다 화면을 하나씩 쌓는다. 이 화면이 보여줄 단계는 주소가 정한다
  // (/onboarding → 첫 단계, /onboarding?step=body → 키·몸무게)
  const [searchParams] = useSearchParams();
  const step = steps.find((candidate) => candidate === searchParams.get("step")) ?? steps[0];
  const stepIndex = steps.indexOf(step);
  const isLastStep = stepIndex === steps.length - 1;

  const form = useSignUpForm();
  const { save, reset } = useSignUpFormActions();

  // 앞 단계 값 없이 중간 단계 주소로 바로 들어왔는지
  const hasPreviousValues = steps
    .slice(0, stepIndex)
    .every((previous) => SIGN_UP_STEPS[previous].every((field) => form[field] !== undefined));

  // 웹에서는 토큰이 메모리에만 있어서, 새로고침하면 다시 로그인해야 한다
  useEffect(() => {
    if (isNativeApp() || getWebAuthAccessToken()) return;

    // navigate(PATH.KAKAO_WEB_LOGIN, { replace: true });
  }, [navigate]);

  // 앞 단계 값이 없으면 첫 단계부터 다시 시작한다
  useEffect(() => {
    if (!hasPreviousValues) navigate(PATH.ONBOARDING, { replace: true });
  }, [hasPreviousValues, navigate]);

  // 첫 화면이 닫히면(가입 완료·중단) 입력값을 비운다. 다음 가입이 이전 값으로 시작하지 않도록
  useEffect(() => {
    if (stepIndex !== 0) return;

    return reset;
  }, [stepIndex, reset]);

  const { submit, isSubmitting } = useSignUpSubmit({
    // 브라우저 기록도 함께 되돌리도록 navigateBack으로 닫는다
    closeStepScreens: () => navigateBack({ count: stepIndex, animate: false }),
    // 가입 요청이 거절되면, 거절된 값을 입력받는 단계까지 화면을 닫는다
    onInvalidField: (field) => {
      const targetIndex = steps.findIndex((candidate) =>
        SIGN_UP_STEPS[candidate].some((stepField) => stepField === field),
      );
      if (targetIndex >= 0 && targetIndex < stepIndex) {
        navigateBack({ count: stepIndex - targetIndex });
      }
    },
  });

  // 입력한 값을 저장하고 다음 단계 화면을 쌓는다. 마지막 단계에서는 가입을 요청한다
  const handleNext = (values: SignUpForm) => {
    const nextForm = save(values);

    if (isLastStep) {
      submit(nextForm);
      return;
    }

    navigate(`${PATH.ONBOARDING}?step=${steps[stepIndex + 1]}`);
  };

  // 모든 단계가 같은 것을 받는다. 마지막 단계는 플랫폼마다 달라서(웹: 구독 코드, 앱: 하는 일)
  // 다음 버튼 문구도 여기서 정한다
  const stepProps = { form, onNext: handleNext, nextLabel: isLastStep ? "시작하기" : "다음" };

  if (!hasPreviousValues) return null;

  return (
    <SignUpFrame>
      <SignUpHeader stepIndex={stepIndex} total={steps.length} onBack={() => navigateBack()} />

      {step === "basicInfo" && <BasicInfoStep {...stepProps} />}
      {step === "body" && <BodyInfoStep {...stepProps} />}
      {step === "activity" && <ActivityLevelStep {...stepProps} />}
      {step === "goal" && <GoalStep {...stepProps} />}
      {step === "goalWeight" && <GoalWeightStep {...stepProps} />}
      {step === "targetCalories" && <TargetCaloriesStep {...stepProps} />}
      {step === "nutrient" && <NutrientRatioStep {...stepProps} />}
      {step === "dietManagement" && <DietManagementStep {...stepProps} />}
      {step === "persona" && <PersonaTypeStep {...stepProps} />}
      {step === "eatingOut" && <EatingOutFrequencyStep {...stepProps} />}
      {step === "jobAndLunch" && <JobAndLunchStep {...stepProps} />}
      {step === "subCode" && <SubCodeStep {...stepProps} />}

      {isSubmitting && <LoadingOverlay label="회원 정보를 저장하는 중입니다." />}
    </SignUpFrame>
  );
}
