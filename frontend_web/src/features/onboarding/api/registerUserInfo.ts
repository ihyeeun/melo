import { END_POINT } from "@/features/onboarding/api/endpoints";
import type { UserInfoRequest, UserInfoResponse } from "@/features/onboarding/onboarding.types";
import { authedApiData } from "@/shared/api/appApi";

export function postRegisterUserInfo(payload: UserInfoRequest) {
  return authedApiData<UserInfoResponse>({
    endpoint: END_POINT.REGISTER_USER_INFO,
    method: "POST",
    body: payload,
  });
}
