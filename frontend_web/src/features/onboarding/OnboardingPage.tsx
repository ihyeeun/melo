import { useCallback, useMemo, useState } from "react";

import OnboardingHeader from "@/features/onboarding/components/OnboardingHeader";
import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/onboarding/constants/inputRanges";
import { useRegisterUserInfoMutation } from "@/features/onboarding/hooks/mutations/useRegisterUserInfoMutation";
import styles from "@/features/onboarding/styles/OnboardingPage.module.css";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/appApi";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { Button } from "@/shared/commons/button/Button";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import { getOnboardingSteps, STEP_COMPONENTS } from "./components/steps/steps";
import type { OnboardingData, StepId } from "./onboarding.types";

type RegisterUserInfoErrorResolution = {
  message: string;
  openNutrientTotalModal?: boolean;
  shouldGoHome?: boolean;
  stepId?: StepId;
};

function resolveRegisterUserInfoError(error: Error): RegisterUserInfoErrorResolution {
  if (!(error instanceof AppApiError)) {
    return {
      message: "회원 정보 등록에 실패했어요",
    };
  }

  if (error.statusCode === 400 && error.message === "ratio sum must be 100") {
    return {
      message: "탄단지 비율의 합을 100으로 맞춰주세요",
      openNutrientTotalModal: true,
      stepId: "nutrient",
    };
  }

  if (error.statusCode === 400 && error.message === "Subscription code is not active") {
    return {
      message: "사용 기간이 지났거나 비활성화된 구독 코드예요",
      stepId: "subscribedCode",
    };
  }

  if (
    error.statusCode === 403 &&
    error.message === "Not a member of the USER (only USER can call this api)"
  ) {
    return {
      message: "회원 인증이 필요해요. 다시 로그인해주세요",
    };
  }

  if (error.statusCode === 404 && error.message === "Subscription code not found") {
    return {
      message: "존재하지 않는 구독 코드예요",
      stepId: "subscribedCode",
    };
  }

  if (error.statusCode === 409 && error.message === "Your profile already exists") {
    return {
      message: "이미 등록된 프로필이 있어요",
      shouldGoHome: true,
    };
  }

  if (error.statusCode === 409 && error.message === "Your subCode already exists") {
    return {
      message: "이미 등록한 구독 코드예요",
      stepId: "subscribedCode",
    };
  }

  if (error.statusCode === 409 && error.message === "Subscription code usage limit exceeded") {
    return {
      message: "사용 한도가 초과된 구독 코드예요",
      stepId: "subscribedCode",
    };
  }

  return {
    message: "회원 정보 등록에 실패했어요",
  };
}

function isBodyRangeValid(data: OnboardingData) {
  return (
    isInRange(data.height, ONBOARDING_HEIGHT_RANGE.min, ONBOARDING_HEIGHT_RANGE.max) &&
    isInRange(data.weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)
  );
}

function isGoalWeightRangeValid(data: OnboardingData) {
  return isInRange(data.target_weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max);
}

export default function OnboardingPage() {
  const [userData, setUserData] = useState<OnboardingData>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isNutrientTotalModalOpen, setIsNutrientTotalModalOpen] = useState(false);
  const navigate = useNavigate();
  const showSubscribedCodeStep = !isNativeApp();
  const steps = useMemo(
    () => getOnboardingSteps({ showSubscribedCodeStep }),
    [showSubscribedCodeStep],
  );

  const step = steps[stepIndex];
  const total = steps.length;

  const { mutate, isPending: isRegisterPending } = useRegisterUserInfoMutation({
    onSuccess: () => {
      syncAppTab("home");
      navigate(PATH.HOME, { replace: true });
    },
    onError: (error) => {
      const resolved = resolveRegisterUserInfoError(error);

      toast.warning(resolved.message);

      if (resolved.openNutrientTotalModal) {
        setIsNutrientTotalModalOpen(true);
      }

      if (resolved.stepId) {
        const nextStepIndex = steps.findIndex((candidate) => candidate.id === resolved.stepId);

        if (nextStepIndex >= 0) {
          setStepIndex(nextStepIndex);
        }
      }

      if (resolved.shouldGoHome) {
        syncAppTab("home");
        navigate(PATH.HOME, { replace: true });
      }
    },
  });

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setUserData((d) => ({ ...d, ...patch }));
  }, []);

  const canGoNext = useMemo(() => {
    return step.isValid(userData);
  }, [step, userData]);

  const next = () => {
    if (step.id === "body" && !isBodyRangeValid(userData)) {
      toast.warning("정확한 값인지 다시 확인해주세요");
      return;
    }

    if (step.id === "goalWeight" && !isGoalWeightRangeValid(userData)) {
      toast.warning("정확한 값인지 다시 확인해주세요");
      return;
    }

    if (step.id === "nutrient") {
      const carbs = userData.carbs ?? 0;
      const protein = userData.protein ?? 0;
      const fat = userData.fat ?? 0;
      const nutrientTotal = carbs + protein + fat;
      const isNutrientTotalValid = Math.abs(nutrientTotal - 100) < 0.001;

      if (!isNutrientTotalValid) {
        setIsNutrientTotalModalOpen(true);
        return;
      }
    }

    const isLastStep = stepIndex === total - 1;

    if (!isLastStep) {
      setStepIndex((s) => s + 1);
      return;
    }

    mutate({
      gender: userData.gender!,
      birthYear: userData.birthYear!,
      height: userData.height!,
      weight: userData.weight!,
      activity: userData.activity!,
      goal: userData.goal!,
      target_weight: userData.target_weight!,
      target_calories: userData.target_calories!,
      target_ratio: [userData.carbs!, userData.protein!, userData.fat!],
      subCode: userData.subscribedCode?.trim() ?? "",
    });
  };

  const prev = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  };

  const StepComponent = STEP_COMPONENTS[step.id];

  return (
    <div className={styles.page}>
      <OnboardingHeader stepIndex={stepIndex} total={total} onPrev={prev} />

      <main className={styles.main}>
        <StepComponent data={userData} update={update} />
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={next}
          disabled={!canGoNext || isRegisterPending}
          fullWidth
          variant="filled"
          size="large"
          color="primary"
          interaction={canGoNext && !isRegisterPending ? "normal" : "disable"}
        >
          {step.nextText ?? "다음"}
        </Button>
      </footer>

      {isRegisterPending ? <LoadingOverlay label="회원 정보를 저장하는 중입니다." /> : null}

      <CheckButtonModal
        open={isNutrientTotalModalOpen}
        onOpenChange={setIsNutrientTotalModalOpen}
        title="영양소 비율 확인"
        description="탄단지 비율의 합을 100으로 맞춰주세요"
      />
    </div>
  );
}
