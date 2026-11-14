import { useRegisterUserInfoMutation } from "@/features/sign-up/hooks/mutations/useRegisterUserInfoMutation";
import {
  JOB_TYPE,
  type SignUpForm,
  type SignUpType,
  type UserInfoRequest,
} from "@/features/sign-up/types/signUp.type";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/apiClient";
import { API_ERROR_MESSAGE } from "@/shared/api/apiErrorMessage";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

// 가입 요청이 실패했을 때, 사용자가 다시 입력해야 하는 값
const FIELD_TO_FIX: Partial<Record<string, keyof SignUpType>> = {
  [API_ERROR_MESSAGE.NUTRIENT_RATIO_TOTAL]: "target_ratio",
  [API_ERROR_MESSAGE.SUB_CODE_INACTIVE]: "subCode",
  [API_ERROR_MESSAGE.SUB_CODE_NOT_FOUND]: "subCode",
  [API_ERROR_MESSAGE.SUB_CODE_ALREADY_EXISTS]: "subCode",
  [API_ERROR_MESSAGE.SUB_CODE_LIMIT_EXCEEDED]: "subCode",
};

function toUserInfoRequest(
  form: SignUpForm,
  { includeSubCode }: { includeSubCode: boolean },
): UserInfoRequest | null {
  const {
    gender,
    birthYear,
    height,
    weight,
    activity,
    goal,
    target_weight,
    target_calories,
    target_ratio,
    diet_management_status,
    persona_type,
    eating_out_freq_weekly,
    job_type,
  } = form;

  if (
    gender === undefined ||
    birthYear === undefined ||
    height === undefined ||
    weight === undefined ||
    activity === undefined ||
    goal === undefined ||
    target_weight === undefined ||
    target_calories === undefined ||
    target_ratio === undefined ||
    diet_management_status === undefined ||
    persona_type === undefined ||
    eating_out_freq_weekly === undefined ||
    job_type === undefined
  ) {
    return null;
  }

  return {
    gender,
    birthYear,
    height,
    weight,
    activity,
    goal,
    target_weight,
    target_calories,
    target_ratio,
    diet_management_status,
    persona_type,
    eating_out_freq_weekly,
    job_type,
    // 점심 장소는 직장인일 때만 묻는다
    lunch_location: job_type === JOB_TYPE.OFFICE ? (form.lunch_location ?? null) : null,
    ...(includeSubCode && { subCode: form.subCode?.trim() ?? "" }),
  };
}

type Options = {
  // 가입을 마치고 떠나기 전에 쌓인 단계 화면을 닫는다
  closeStepScreens: () => void;
  onInvalidField: (field: keyof SignUpType) => void;
};

export function useSignUpSubmit({ closeStepScreens, onInvalidField }: Options) {
  const navigate = useNavigate();

  // 단계 화면을 닫은 뒤 첫 화면을 바꿔서 들어간다. 회원가입 화면이 남아 있으면 뒤로가기로 다시 열린다
  const enterApp = () => {
    closeStepScreens();

    if (isNativeApp()) {
      syncAppTab("home");
      navigate(PATH.HOME, { replace: true });
      return;
    }

    navigate(PATH.APP_INFO, { replace: true });
  };

  const { mutate, isPending } = useRegisterUserInfoMutation({
    onSuccess: enterApp,
    onError: (error) => {
      if (!(error instanceof AppApiError)) {
        toast.warning(API_ERROR_MESSAGE.DEFAULT);
        return;
      }

      toast.warning(error.message);

      // 이미 프로필이 있으면 가입이 끝난 것으로 보고 들여보낸다
      if (error.message === API_ERROR_MESSAGE.PROFILE_ALREADY_EXISTS) {
        enterApp();
        return;
      }

      const field = FIELD_TO_FIX[error.message];
      if (field) onInvalidField(field);
    },
  });

  const submit = (form: SignUpForm) => {
    if (isPending) return;

    const payload = toUserInfoRequest(form, { includeSubCode: !isNativeApp() });
    if (!payload) {
      toast.warning("입력하지 않은 정보가 있어요");
      return;
    }

    mutate(payload);
  };

  return { submit, isSubmitting: isPending };
}
