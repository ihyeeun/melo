import { useCallback, useEffect, useMemo, useState } from "react";

import { getWebAuthAccessToken } from "@/features/kakao-web-auth/api/webAuthApi";
import OnboardingHeader from "@/features/onboarding/components/OnboardingHeader";
import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/onboarding/constants/inputRanges";
import { useRegisterUserInfoMutation } from "@/features/onboarding/hooks/mutations/useRegisterUserInfoMutation";
import styles from "@/features/onboarding/styles/OnboardingPage.module.css";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/apiClient";
import { API_ERROR_MESSAGE } from "@/shared/api/apiErrorMessage";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { Button } from "@/shared/commons/button/Button";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import { getOnboardingSteps } from "./components/steps/steps";
import type { OnboardingData, StepId, UserInfoRequest } from "./onboarding.types";

type RegisterUserInfoErrorResolution = {
  openNutrientTotalModal?: boolean;
  shouldGoHome?: boolean;
  stepId?: StepId;
};

function resolveRegisterUserInfoError(error: Error): RegisterUserInfoErrorResolution {
  if (!(error instanceof AppApiError)) {
    return {};
  }

  if (error.statusCode === 400 && error.message === API_ERROR_MESSAGE.NUTRIENT_RATIO_TOTAL) {
    return {
      openNutrientTotalModal: true,
      stepId: "nutrient",
    };
  }

  if (error.message === API_ERROR_MESSAGE.SUB_CODE_INACTIVE) {
    return {
      stepId: "subCode",
    };
  }

  if (error.statusCode === 403 && error.message === API_ERROR_MESSAGE.USER_AUTH_REQUIRED) {
    return {};
  }

  if (error.message === API_ERROR_MESSAGE.SUB_CODE_NOT_FOUND) {
    return {
      stepId: "subCode",
    };
  }

  if (error.statusCode === 409 && error.message === API_ERROR_MESSAGE.PROFILE_ALREADY_EXISTS) {
    return {
      shouldGoHome: true,
    };
  }

  if (error.message === API_ERROR_MESSAGE.SUB_CODE_ALREADY_EXISTS) {
    return {
      stepId: "subCode",
    };
  }

  if (error.message === API_ERROR_MESSAGE.SUB_CODE_LIMIT_EXCEEDED) {
    return {
      stepId: "subCode",
    };
  }

  return {};
}

function resolveRegisterUserInfoErrorMessage(error: Error) {
  if (error instanceof AppApiError) {
    return error.message;
  }

  return API_ERROR_MESSAGE.DEFAULT;
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
  const isWebOnboarding = !isNativeApp();
  const showSubscribedCodeStep = isWebOnboarding;
  const steps = useMemo(
    () => getOnboardingSteps({ showSubscribedCodeStep }),
    [showSubscribedCodeStep],
  );

  useEffect(() => {
    if (!isWebOnboarding) return;
    if (getWebAuthAccessToken()) return;

    navigate(PATH.KAKAO_WEB_LOGIN, { replace: true });
  }, [isWebOnboarding, navigate]);

  const navigateAfterOnboarding = useCallback(() => {
    if (isNativeApp()) {
      syncAppTab("home");
      navigate(PATH.HOME, { replace: true });
      return;
    }

    navigate(PATH.APP_INFO, { replace: true });
  }, [navigate]);

  const step = steps[stepIndex];
  const total = steps.length;

  const handleOnboardingMutationError = useCallback(
    (error: Error) => {
      const resolved = resolveRegisterUserInfoError(error);

      toast.warning(resolveRegisterUserInfoErrorMessage(error));

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
        navigateAfterOnboarding();
      }
    },
    [navigateAfterOnboarding, steps],
  );

  const { mutate, isPending: isRegisterPending } = useRegisterUserInfoMutation({
    onSuccess: navigateAfterOnboarding,
    onError: handleOnboardingMutationError,
  });
  const isSubmitting = isRegisterPending;

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

    const registerUserInfoPayload: UserInfoRequest = {
      gender: userData.gender!,
      birthYear: userData.birthYear!,
      height: userData.height!,
      weight: userData.weight!,
      activity: userData.activity!,
      goal: userData.goal!,
      target_weight: userData.target_weight!,
      target_calories: userData.target_calories!,
      target_ratio: [
        userData.carbs!,
        userData.protein!,
        userData.fat!,
      ] as UserInfoRequest["target_ratio"],
      diet_management_status: userData.diet_management_status ?? [],
      persona_type: userData.persona_type ?? 0,
      eating_out_freq_weekly: userData.eating_out_freq_weekly ?? 0,
      job_type: userData.job_type ?? 0,
      lunch_location: userData.job_type === 0 ? userData.lunch_location ?? null : null,
    };

    if (isWebOnboarding) {
      const subCode = userData.subCode?.trim() ?? "";
      const webRegisterUserInfoPayload = {
        ...registerUserInfoPayload,
        subCode,
      };

      mutate(webRegisterUserInfoPayload);
      return;
    }

    mutate(registerUserInfoPayload);
  };

  const prev = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  };

  const StepComponent = step.component;

  const onboardingContent = (
    <div className={styles.page}>
      <OnboardingHeader stepIndex={stepIndex} total={total} onPrev={prev} />

      <main className={styles.main}>
        <StepComponent data={userData} update={update} />
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={next}
          disabled={!canGoNext || isSubmitting}
          fullWidth
          variant="filled"
          size="large"
          color="primary"
          interaction={canGoNext && !isSubmitting ? "normal" : "disable"}
        >
          {step.nextText ?? "다음"}
        </Button>
      </footer>

      {isRegisterPending ? <LoadingOverlay label="회원 정보를 저장하는 중입니다." /> : null}

      <CheckButtonModal
        open={isNutrientTotalModalOpen}
        onOpenChange={setIsNutrientTotalModalOpen}
        title="영양소 비율 확인"
        description={API_ERROR_MESSAGE.NUTRIENT_RATIO_TOTAL}
      />
    </div>
  );

  if (isWebOnboarding) {
    return (
      <div className={styles.webFrameContainer}>
        <div className={styles.phoneFrame}>{onboardingContent}</div>
      </div>
    );
  }

  return onboardingContent;
}
