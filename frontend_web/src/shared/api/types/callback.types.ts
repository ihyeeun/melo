import type { AppApiError } from "@/shared/api/appApi";

export interface UseMutationCallback<TError = AppApiError> {
  onSuccess?: () => void;
  onError?: (error: TError) => void;
  onMutate?: () => void; //요청이 발송 되었을 때
  onSettled?: () => void; //요청이 종료 되었을 때
}
