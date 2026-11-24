import { AppApiError } from "@/shared/api/apiClient";
import { API_ERROR_MESSAGE } from "@/shared/api/apiErrorMessage";

// 구독 코드가 거절된 이유별 설명. 회원가입 마지막 단계와 로그인 후 코드 등록이 같이 쓴다
const SUB_CODE_ERROR_DESCRIPTIONS: Partial<Record<string, string | undefined>> = {
  [API_ERROR_MESSAGE.SUB_CODE_REQUIRED]: undefined,
  [API_ERROR_MESSAGE.SUB_CODE_NOT_FOUND]: "대소문자 · 띄어쓰기까지 다시 확인해주세요",
  [API_ERROR_MESSAGE.SUB_CODE_INACTIVE]: "문의해주세요",
  [API_ERROR_MESSAGE.SUB_CODE_LIMIT_EXCEEDED]: "문의해주세요",
  [API_ERROR_MESSAGE.SUB_CODE_ALREADY_EXISTS]: undefined,
};

// 구독 코드 때문에 거절됐으면 경고 토스트 내용을, 아니면 null을 돌려준다
export function getSubCodeErrorToast(error: unknown) {
  if (!(error instanceof AppApiError) || !error.userMessage) return null;
  if (!(error.userMessage in SUB_CODE_ERROR_DESCRIPTIONS)) return null;

  return {
    title: error.userMessage,
    description: SUB_CODE_ERROR_DESCRIPTIONS[error.userMessage],
  };
}
