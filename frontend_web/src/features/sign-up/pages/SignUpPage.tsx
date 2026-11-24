import { useEffect, useMemo, useState } from "react";

import {
  clearWebAuthAccessToken,
  getWebAuthAccessToken,
} from "@/features/kakao-web-auth/api/webAuthApi";
import { GOAL } from "@/features/profile/goalEdit.model";
import { logout } from "@/features/settings/api/account";
import { SignUpFrame } from "@/features/sign-up/components/SignUpFrame";
import { SignUpHeader } from "@/features/sign-up/components/SignUpHeader";
import { AcquisitionChannelStep } from "@/features/sign-up/components/steps/AcquisitionChannelStep";
import { ActivityLevelStep } from "@/features/sign-up/components/steps/ActivityLevelStep";
import { BasicInfoStep } from "@/features/sign-up/components/steps/BasicInfoStep";
import { BodyInfoStep } from "@/features/sign-up/components/steps/BodyInfoStep";
import { DietManagementStep } from "@/features/sign-up/components/steps/DietManagementStep";
import { EatingOutFrequencyStep } from "@/features/sign-up/components/steps/EatingOutFrequencyStep";
import { ExerciseFrequencyStep } from "@/features/sign-up/components/steps/ExerciseFrequencyStep";
import { Glp1UseStep } from "@/features/sign-up/components/steps/Glp1UseStep";
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
  SIGN_UP_PROGRESS,
  SIGN_UP_PROGRESS_TOTAL,
  SIGN_UP_STEPS,
  type SignUpForm,
  type SignUpStep,
} from "@/features/sign-up/types/signUp.type";
import { PATH } from "@/router/path";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import { useNativeAppFeature } from "@/shared/api/bridge/useNativeAppFeature";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

// 구독 코드는 웹에서 가입할 때만, 목표 몸무게는 체중 유지가 아닐 때만 입력받는다
function getSignUpSteps(goal: SignUpForm["goal"]) {
  return (Object.keys(SIGN_UP_STEPS) as SignUpStep[]).filter((step) => {
    if (step === "subCode") return !isNativeApp();
    if (step === "goalWeight") return goal !== GOAL.MAINTAIN_WEIGHT;
    return true;
  });
}

// screen: ONB-01-003, ONB-01-004, ONB-01-005, ONB-01-006, ONB-01-007, ONB-01-008
// screen: ONB-01-009, ONB-01-010, ONB-01-011, ONB-01-012, ONB-01-013
// screen: ONB-01-014, ONB-01-015, ONB-01-016, ONB-01-017
export default function SignUpPage() {
  const navigate = useNavigate();
  const form = useSignUpForm();
  const { save, reset } = useSignUpFormActions();
  const steps = useMemo(() => getSignUpSteps(form.goal), [form.goal]);

  // 단계마다 화면을 하나씩 쌓는다. 이 화면이 보여줄 단계는 주소가 정한다
  // (/onboarding → 첫 단계, /onboarding?step=body → 키·몸무게)
  const [searchParams] = useSearchParams();
  const step = steps.find((candidate) => candidate === searchParams.get("step")) ?? steps[0];
  const stepIndex = steps.indexOf(step);
  const isLastStep = stepIndex === steps.length - 1;

  // 첫 단계에서는 다른 계정으로 다시 로그인할 수 있다. 앱은 로그아웃 뒤 로그인 화면으로 돌려보낼 수 있을 때만
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const canSignOutInApp = useNativeAppFeature("SIGN_OUT_FROM_SIGN_UP");
  const canSwitchAccount = stepIndex === 0 && (!isNativeApp() || canSignOutInApp === true);

  const switchAccount = async () => {
    if (isNativeApp()) {
      // 앱이 토큰을 지우고 로그인 화면으로 보낸다
      await logout();
      return;
    }

    clearWebAuthAccessToken();
    navigate(PATH.KAKAO_WEB_LOGIN, { replace: true });
  };

  // 앞 단계 값 없이 중간 단계 주소로 바로 들어왔는지
  const hasPreviousValues = steps
    .slice(0, stepIndex)
    .every((previous) => SIGN_UP_STEPS[previous].every((field) => form[field] !== undefined));

  // 웹에서는 토큰이 메모리에만 있어서, 새로고침하면 다시 로그인해야 한다
  useEffect(() => {
    if (isNativeApp() || getWebAuthAccessToken()) return;

    navigate(PATH.KAKAO_WEB_LOGIN, { replace: true });
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

    // 방금 고른 목표에 따라 다음 단계가 달라지므로(체중 유지 → 목표 몸무게 건너뜀) 저장한 값으로 다시 구한다
    const nextSteps = getSignUpSteps(nextForm.goal);
    navigate(`${PATH.ONBOARDING}?step=${nextSteps[nextSteps.indexOf(step) + 1]}`);
  };

  // 모든 단계가 같은 것을 받는다. 마지막 단계는 플랫폼마다 달라서(웹: 구독 코드, 앱: 마케팅 채널)
  // 다음 버튼 문구도 여기서 정한다
  const stepProps = { form, onNext: handleNext, nextLabel: isLastStep ? "시작하기" : "다음" };

  if (!hasPreviousValues) return null;

  return (
    <SignUpFrame>
      <SignUpHeader
        stepIndex={stepIndex}
        progress={SIGN_UP_PROGRESS[step]}
        total={SIGN_UP_PROGRESS_TOTAL}
        onBack={() => navigateBack()}
        onSwitchAccount={canSwitchAccount ? () => setIsSwitchAccountOpen(true) : undefined}
      />

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
      {step === "exercise" && <ExerciseFrequencyStep {...stepProps} />}
      {step === "glp1" && <Glp1UseStep {...stepProps} />}
      {step === "acquisitionChannel" && <AcquisitionChannelStep {...stepProps} />}
      {step === "subCode" && <SubCodeStep {...stepProps} />}

      {/* screen: ONB-01-003 다른 계정 로그인 확인 모달 */}
      <ConfirmModal
        open={isSwitchAccountOpen}
        onOpenChange={setIsSwitchAccountOpen}
        title="지금 계정에서 로그아웃하고 로그인 화면으로 돌아갈까요?"
        cancelText="취소"
        confirmText="로그아웃"
        emphasis="cancel"
        onConfirm={switchAccount}
      />

      {isSubmitting && <LoadingOverlay label="회원 정보를 저장하는 중입니다." />}
    </SignUpFrame>
  );
}
